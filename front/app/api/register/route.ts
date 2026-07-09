import { NextResponse } from "next/server";
import type { RegisterBodyDTO, AuthResponseDTO } from "@superplayer/contracts";
import { api } from "@/app/shared/api/api";
import { API } from "@/app/shared/api/backend";

export async function POST(request: Request) {
  const { email, password } = await request.json() as RegisterBodyDTO;
  const { user } = await api.post<AuthResponseDTO>(API.auth.register, { email, password });

  return NextResponse.json(user);
}