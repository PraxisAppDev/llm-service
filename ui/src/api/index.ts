const API_ROOT = import.meta.env.VITE_LLMSVC_API_ROOT;
const GET_HEADERS = {
  Accept: "application/json",
};
const POST_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminList {
  count: number;
  admins: AdminUser[];
}

export interface ApiKey {
  id: string;
  snippet: string;
  expiresAt: string;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  apiKeys: ApiKey[];
}

interface UserList {
  count: number;
  users: ApiUser[];
}

interface ApiError {
  error: string;
  messages: string[];
}

export const apiRoot = () => API_ROOT;
export const apiDocs = () => `${API_ROOT}/docs`;

// ADMINS --------

export const getAdmins = async () => {
  const response = await fetch(`${API_ROOT}/admins`, {
    method: "GET",
    headers: GET_HEADERS,
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as AdminList;
  } else {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

export const createAdmin = async (params: { name: string; email: string; password: string }) => {
  const response = await fetch(`${API_ROOT}/admins`, {
    method: "POST",
    headers: POST_HEADERS,
    body: JSON.stringify(params),
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as AdminUser;
  } else {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

export const getCurrentAdmin = async (): Promise<AdminUser | undefined> => {
  const response = await fetch(`${API_ROOT}/admins/current`, {
    method: "GET",
    headers: GET_HEADERS,
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as AdminUser;
  } else {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

export const deleteAdmin = async (userId: string) => {
  const response = await fetch(`${API_ROOT}/admins/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

export const changeAdminPw = async (
  userId: string,
  body: { currentPassword: string; newPassword: string },
) => {
  const response = await fetch(`${API_ROOT}/admins/${userId}/password`, {
    method: "PUT",
    headers: POST_HEADERS,
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as AdminUser;
  } else {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

export const createAdminSession = async (credentials: { email: string; password: string }) => {
  const response = await fetch(`${API_ROOT}/admins/sessions`, {
    method: "POST",
    headers: POST_HEADERS,
    body: JSON.stringify(credentials),
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as AdminUser;
  } else {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

export const deleteAdminSession = async (userId: string) => {
  const response = await fetch(`${API_ROOT}/admins/${userId}/sessions`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};

// USERS --------

export const getUsers = async () => {
  const response = await fetch(`${API_ROOT}/users`, {
    method: "GET",
    headers: GET_HEADERS,
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as UserList;
  } else {
    const error = (await response.json()) as ApiError;
    throw new Error(error.messages[0]);
  }
};
