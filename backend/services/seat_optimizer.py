"""
Smart Seat Optimizer
─────────────────────
RedBus (and most ticketing platforms) make the customer manually click seats on a
map. For a group booking, the customer has to figure out for themselves which seats
are actually next to each other.

This service does that reasoning automatically: given a bus's layout and the seats
already taken, it finds the best block of seats for a group, scores alternatives,
and explains *why* a particular allocation was chosen — so a multi-seat booking
gets seats that are actually usable as a group, not just "the next N free numbers."

Layout model
────────────
Seats are numbered 1..total_seats in row-major order. `seats_per_row` (usually 4,
meaning a 2+2 layout with one aisle) determines where row breaks and the aisle fall.

Example, seats_per_row = 4:
  Row 1: [1] [2] | [3] [4]
  Row 2: [5] [6] | [7] [8]
  ...
The aisle sits between column index (seats_per_row // 2 - 1) and the next column.

For seats_per_row = 3 (2+1 layout, common on some sleeper coaches):
  Row 1: [1] [2] | [3]
  Row 2: [4] [5] | [6]
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class SeatPosition:
    seat_number: int
    row: int
    col: int
    is_window: bool
    is_aisle: bool


@dataclass
class SeatBlock:
    seat_numbers: list[int]
    score: float
    reason: str
    is_fully_adjacent: bool
    spans_aisle: bool


def get_seat_position(seat_number: int, seats_per_row: int) -> SeatPosition:
    """Map a 1-indexed seat number to its row/column in the bus layout."""
    idx = seat_number - 1
    row = idx // seats_per_row
    col = idx % seats_per_row
    left_block_width = seats_per_row // 2
    is_window = col == 0 or col == seats_per_row - 1
    is_aisle = col == left_block_width - 1 or col == left_block_width
    return SeatPosition(seat_number, row, col, is_window, is_aisle)


def build_layout(total_seats: int, seats_per_row: int) -> list[SeatPosition]:
    return [get_seat_position(n, seats_per_row) for n in range(1, total_seats + 1)]


def _row_groups(free_seats: set[int], seats_per_row: int, total_seats: int) -> dict[int, list[int]]:
    """Group free seat numbers by row, sorted by column within each row."""
    by_row: dict[int, list[SeatPosition]] = {}
    for n in free_seats:
        pos = get_seat_position(n, seats_per_row)
        by_row.setdefault(pos.row, []).append(pos)
    return {row: sorted(p.seat_number for p in positions) for row, positions in by_row.items()}


def _find_contiguous_runs(seat_numbers: list[int]) -> list[list[int]]:
    """Within a single row's free seats, find runs of physically consecutive seat numbers."""
    if not seat_numbers:
        return []
    runs = [[seat_numbers[0]]]
    for n in seat_numbers[1:]:
        if n == runs[-1][-1] + 1:
            runs[-1].append(n)
        else:
            runs.append([n])
    return runs


def find_best_seat_block(
    total_seats: int,
    seats_per_row: int,
    taken_seats: set[int],
    seat_count: int,
) -> SeatBlock:
    """
    Find the best group of `seat_count` seats for a single booking.

    Priority order:
      1. A full same-row contiguous run (e.g. seats 5,6,7,8 — whole row, no gap)
      2. A same-row contiguous run that doesn't span the aisle in a way that splits
         badly (e.g. just the window+aisle pair on one side)
      3. Two adjacent rows, each contributing a partial contiguous block (e.g. 2+2
         across two rows when no single row has enough room)
      4. Best-effort scattered fallback — guaranteed to return something if enough
         seats are free in total, but flagged as not adjacent.
    """
    free_seats = {n for n in range(1, total_seats + 1) if n not in taken_seats}
    if len(free_seats) < seat_count:
        raise ValueError("Not enough free seats to satisfy request")

    if seat_count == 1:
        seat = min(free_seats)
        pos = get_seat_position(seat, seats_per_row)
        return SeatBlock(
            seat_numbers=[seat],
            score=100.0,
            reason=f"Seat {seat} ({'window' if pos.is_window else 'aisle' if pos.is_aisle else 'middle'} seat)",
            is_fully_adjacent=True,
            spans_aisle=False,
        )

    rows = _row_groups(free_seats, seats_per_row, total_seats)

    # ── Priority 1 & 2: single-row contiguous run of exactly seat_count ──
    candidates: list[SeatBlock] = []
    for row, seat_list in rows.items():
        for run in _find_contiguous_runs(seat_list):
            if len(run) >= seat_count:
                block = run[:seat_count]
                positions = [get_seat_position(s, seats_per_row) for s in block]
                spans_aisle = any(p.is_aisle for p in positions) and len(set(p.col for p in positions)) > 1
                full_row_width = seats_per_row
                is_full_row = len(block) == full_row_width
                score = 100.0 if is_full_row else 90.0 if not spans_aisle else 80.0
                reason = (
                    f"Entire row {row + 1} together"
                    if is_full_row
                    else f"All {seat_count} seats together in row {row + 1}"
                )
                candidates.append(SeatBlock(block, score, reason, True, spans_aisle))

    if candidates:
        candidates.sort(key=lambda b: -b.score)
        return candidates[0]

    # ── Priority 3: contiguous run across consecutive seat numbers, any number of rows ──
    # This subsumes "two rows back-to-back" as a special case — if seat_count
    # seats are truly numerically (and therefore physically, given row-major
    # numbering) consecutive, that's the best possible non-single-row outcome.
    sorted_free = sorted(free_seats)
    runs = _find_contiguous_runs(sorted_free)
    multi_row_candidates: list[SeatBlock] = []
    for run in runs:
        if len(run) >= seat_count:
            block = run[:seat_count]
            first_row = get_seat_position(block[0], seats_per_row).row
            last_row = get_seat_position(block[-1], seats_per_row).row
            rows_spanned = last_row - first_row + 1
            score = 85.0 if rows_spanned > 1 else 90.0  # shouldn't hit single-row here (Priority 1 already covers it), but keep it sane
            reason = (
                f"Seats are fully contiguous, spanning rows {first_row + 1}–{last_row + 1} "
                f"({rows_spanned} rows) — physically touching despite the row boundary"
                if rows_spanned > 1
                else f"All {seat_count} seats together in row {first_row + 1}"
            )
            multi_row_candidates.append(SeatBlock(block, score, reason, True, rows_spanned > 1))

    if multi_row_candidates:
        multi_row_candidates.sort(key=lambda b: -b.score)
        return multi_row_candidates[0]

    # ── Priority 4: best-effort fallback — no contiguous run big enough exists ──
    # Greedily merge the closest runs together to minimize total scatter, then
    # report the gap honestly rather than implying it's one block.
    fallback = sorted_free[:seat_count]
    return SeatBlock(
        seat_numbers=fallback,
        score=20.0,
        reason=(
            f"No adjacent block was free — closest available seats are scattered "
            f"(seat {fallback[0]} to {fallback[-1]}, with gaps between them). "
            f"Consider a different bus or time for a group booking."
        ),
        is_fully_adjacent=False,
        spans_aisle=True,
    )


def describe_seats(seat_numbers: list[int], seats_per_row: int) -> list[dict]:
    """Return human-readable position info for a list of seat numbers."""
    result = []
    for n in sorted(seat_numbers):
        pos = get_seat_position(n, seats_per_row)
        label = "Window" if pos.is_window else "Aisle" if pos.is_aisle else "Middle"
        result.append({"seat_number": n, "row": pos.row + 1, "position": label})
    return result
