const API_ROOT = import.meta.env.VITE_LLMSVC_API_ROOT;
const GET_HEADERS = {
  Accept: "application/json",
};
const POST_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  error: string;
  messages: string[];
}

export const getCurrentAdmin = async () => {
  const response = await fetch(`${API_ROOT}/admins/current`, {
    method: "GET",
    headers: GET_HEADERS,
  });

  if (response.ok) {
    const user = (await response.json()) as AdminUser;

    return {
      user,
      error: undefined,
    };
  } else {
    const error = (await response.json()) as ApiError;

    return {
      user: undefined,
      error,
    };
  }
};

export const createAdminSession = async (credentials: {
  email: string;
  password: string;
}) => {
  const response = await fetch(`${API_ROOT}/admins/sessions`, {
    method: "POST",
    headers: POST_HEADERS,
    body: JSON.stringify(credentials),
  });

  if (response.ok) {
    const user = (await response.json()) as AdminUser;

    return {
      user,
      error: undefined,
    };
  } else {
    const error = (await response.json()) as ApiError;

    return {
      user: undefined,
      error,
    };
  }
};
