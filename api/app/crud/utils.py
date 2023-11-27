"""Utility functions for CRUD operations agains mongo databases."""


def query_region_helper(start_pos: int, end_pos: int, motif_type="other"):
    """Limit query to a chromosomal region."""
    if motif_type == "sv":  # for sv are start called position
        start_name = "position"
    else:
        start_name = "start"
    position_arg = {"$gte": start_pos, "$lte": end_pos}
    return {
        "$or": [
            {start_name: position_arg},
            {"end": position_arg},
            {"$and": [{start_name: {"$lte": start_pos}}, {"end": {"$gte": end_pos}}]},
        ],
    }