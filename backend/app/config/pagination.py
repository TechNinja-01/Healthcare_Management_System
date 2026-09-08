from math import ceil

from app.config.constants import (
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
)


class Pagination:

    @staticmethod
    def paginate(data, page=DEFAULT_PAGE, page_size=DEFAULT_PAGE_SIZE):

        page = max(page, 1)
        page_size = min(max(page_size, 1), MAX_PAGE_SIZE)

        total = len(data)

        start = (page - 1) * page_size
        end = start + page_size

        return {
            "items": data[start:end],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_records": total,
                "total_pages": ceil(total / page_size),
                "has_next": page * page_size < total,
                "has_previous": page > 1,
            },
        }