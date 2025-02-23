import { addDays, formatISO } from "date-fns";
import { authorizeToken, pwHash, pwVerify, sid, uid } from "../auth";
import { responseTypes } from "../common";
import { adminSessions, adminUsers } from "../db";
import { ChangeAdminPwRequest, CreateAdminRequest } from "../schemas";

export const listAdmins = async (token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  const admins = await adminUsers.list();

  return {
    admins: {
      count: admins.length,
      admins,
    },
  };
};

export const createAdmin = async (req: CreateAdminRequest, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  const existingUser = await adminUsers.find(req.email);

  if (existingUser) {
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: [`Admin with email ${req.email} already exists`],
      },
      errorStatus: 400 as 400,
    };
  }

  const id = uid();
  const pwh = await pwHash(req.password);
  const now = formatISO(new Date());

  const admin = {
    id,
    name: req.name,
    email: req.email,
    createdAt: now,
    updatedAt: now,
  };

  await adminUsers.create(admin, pwh);

  return {
    admin,
  };
};

export const changeAdminPw = async (req: ChangeAdminPwRequest, userId: string, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  if (userId !== auth.adminUser.user.id) {
    // only let admins change their own passwords
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: ["Admins can only change their own passwords"],
      },
      errorStatus: 400 as 400,
    };
  }

  if (!(await pwVerify(auth.adminUser.passwordHash, req.currentPassword))) {
    // waste some more time to throttle
    await pwHash(req.newPassword);
    await pwHash(req.newPassword);
    await pwHash(req.newPassword);

    return {
      error: {
        error: responseTypes.unauthorized,
        messages: ["Authorization failed"],
      },
      errorStatus: 401 as 401,
    };
  }

  const updatedUser = { ...auth.adminUser.user, updatedAt: formatISO(new Date()) };
  const pwh = await pwHash(req.newPassword);

  await adminUsers.updatePw(updatedUser, pwh);

  return { admin: updatedUser };
};

export const deleteAdmin = async (userId: string, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  if (userId === auth.adminUser.user.id) {
    // don't let admins delete their own accounts
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: ["Admins can't delete their own accounts"],
      },
      errorStatus: 400 as 400,
    };
  }

  return { ok: true };
};

export const currentAdmin = async (token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  return {
    admin: auth.adminUser,
  };
};

export const loginAdmin = async (email: string, password: string) => {
  const admin = await adminUsers.find(email);

  if (admin && (await pwVerify(admin.passwordHash, password))) {
    // create the session
    const sessionToken = sid();
    const expiresAt = addDays(new Date(), 30);
    await adminSessions.create(admin.user, sessionToken, expiresAt);

    return {
      admin: admin.user,
      token: sessionToken,
      tokenExpiresAt: expiresAt,
    };
  } else {
    // waste some more time to throttle
    await pwHash(password);
    await pwHash(password);
    await pwHash(password);

    return {
      error: {
        error: responseTypes.unauthorized,
        messages: ["Invalid email or password"],
      },
      errorStatus: 401 as 401,
    };
  }
};

export const logoutAdmin = async (userId: string, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  if (userId === auth.adminUser.user.id) {
    // valid session that matches the given user ID; delete the session
    await adminSessions.delete(userId, token!);
    return { ok: true };
  } else {
    return {
      error: {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
      errorStatus: 401 as 401,
    };
  }
};
