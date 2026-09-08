
export function getErrorMessage(error, fallback = "Something went wrong") {
  if (!error) {
    return fallback;
  }

  const status = error.response?.status;
  const body = error.response?.data;

  if (typeof body?.detail === "string") {
    return body.detail;
  }

  if (typeof body?.message === "string") {
    return body.message;
  }

  if (Array.isArray(body?.detail)) {
    return body.detail
      .map((item) => item.msg || item.message || JSON.stringify(item))
      .join(", ");
  }

  if (status === 401) {
    return "Session expired. Please login again.";
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested resource was not found.";
  }

  if (status === 409) {
    return body?.message || body?.detail || "That username, email, or ID is already taken.";
  }

  if (status === 422) {
    return "Please check the submitted fields.";
  }

  if (status >= 500) {
    return "Server error. Please try again later.";
  }

  return error.message || fallback;
}

/**
 * ApiResponse wrapper: { success, message, data }
 */
export function getApiData(response) {
  return response?.data?.data ?? null;
}

export function getApiMessage(response, fallback = "Success") {
  return response?.data?.message || fallback;
}

/**
 * Login/refresh return flat token payloads (not ApiResponse).
 */
export function getTokenPayload(response) {
  return response?.data ?? null;
}
