import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role = "admin", permissions } = await request.json()

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Email, password, and full name are required" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      return NextResponse.json({ error: "Failed to create user", details: authError.message }, { status: 400 })
    }

    // Default permissions for regular admin
    const defaultPermissions = permissions || {
      vehicles: { create: true, read: true, update: true, delete: false },
      bookings: { create: true, read: true, update: true, delete: false },
      analytics: { read: true },
      users: { read: false },
      settings: { read: true, update: false },
    }

    // Create admin profile
    const { error: profileError } = await supabase.from("admin_profiles").insert({
      id: authData.user.id,
      email: authData.user.email,
      full_name: fullName,
      role,
      permissions: defaultPermissions,
      is_active: true,
    })

    if (profileError) {
      // If profile creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Failed to create admin profile", details: profileError.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      userId: authData.user.id,
      email: authData.user.email,
    })
  } catch (error) {
    console.error("Error creating admin user:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}