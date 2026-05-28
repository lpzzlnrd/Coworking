function buildPageResponse(content, page, size, totalElements) {
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const sortedDescriptor = {
    empty: false,
    sorted: true,
    unsorted: false
  };

  return {
    content,
    pageable: {
      pageNumber: page,
      pageSize: size,
      sort: sortedDescriptor,
      offset: page * size,
      paged: true,
      unpaged: false
    },
    last: totalPages === 0 ? true : page >= totalPages - 1,
    totalPages,
    totalElements,
    size,
    number: page,
    sort: sortedDescriptor,
    first: page === 0,
    numberOfElements: content.length,
    empty: content.length === 0
  };
}

module.exports = { buildPageResponse };
