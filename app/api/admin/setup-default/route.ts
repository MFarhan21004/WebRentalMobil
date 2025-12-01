import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Cek apakah admin sudah ada (menggunakan email baru)
    const { data: existingAdmin } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("email", "muhammadfarhan21004@gmail.com")
      .single()

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: "Super admin already exists",
        email: "muhammadfarhan21004@gmail.com",
      })
    }

    // Buat user baru di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "muhammadfarhan21004@gmail.com",
      password: "RentalFarhan#21004",
      email_confirm: true,
      user_metadata: {
        full_name: "Super Admin", // Bisa diubah jadi "Muhammad Farhan" jika mau
      },
    })

    if (authError) {
      return NextResponse.json({ error: "Failed to create default admin", details: authError.message }, { status: 400 })
    }

    // Buat profile admin dengan akses penuh (Super Admin)
    const { error: profileError } = await supabase.from("admin_profiles").insert({
      id: authData.user.id,
      email: authData.user.email,
      full_name: "Super Admin",
      role: "super_admin",
      permissions: {
        vehicles: { create: true, read: true, update: true, delete: true },
        bookings: { create: true, read: true, update: true, delete: true },
        analytics: { read: true },
        users: { create: true, read: true, update: true, delete: true },
        settings: { read: true, update: true },
      },
      is_active: true,
    })

    if (profileError) {
      // Jika pembuatan profile gagal, hapus user auth agar tidak nyangkut
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: "Failed to create admin profile", details: profileError.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Default admin created successfully",
      email: "muhammadfarhan21004@gmail.com",
      password: "RentalFarhan21004",
      note: "Please change the password immediately after first login",
    })
  } catch (error) {
    console.error("Error creating default admin:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}