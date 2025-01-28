"use server";

import { signIn } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import config from "@/lib/config";
import ratelimit from "@/lib/ratelimit";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { workflowClient } from "../workflow";

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">,
) => {
  const { email, password } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0,1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    redirect("/too-fast");
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.log(error, "Sign In error");
    return {
      success: false,
      error: "Sign in error",
    };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, universityCard, universityId, password } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0,1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    redirect("/too-fast");
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      success: false,
      error: "User already exists",
    };
  }

  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      fullName,
      email,
      universityId,
      universityCard,
      password: hashedPassword,
    });

    await workflowClient.trigger({
      url: `${config.env.prodApiEndpoint}/api/workflows/onboarding`,
      body: {
        email,
        fullName,
      },
    });

    await signInWithCredentials({ email, password });
    return { success: true };
  } catch (error) {
    console.error(error, "Sign up error");
    return { success: false, error: "Sign up error" };
  }
};
