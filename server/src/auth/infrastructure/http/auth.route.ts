import "@fastify/rate-limit";
import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller.ts";
import {
  AuthResponse,
  CsrfTokenResponse,
  LoginBody,
  RegisterBody,
} from "./auth.schema.ts";

export class AuthRoute {
  constructor(private readonly authController: AuthController) {}
  async register(fastify: FastifyInstance) {
    fastify.post("/register", {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: RegisterBody,
        response: {
          201: AuthResponse,
        },
      },
      handler: this.authController.register.bind(this.authController),
    });
    fastify.post("/login", {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      schema: {
        body: LoginBody,
        response: {
          200: AuthResponse,
        },
      },
      handler: this.authController.login.bind(this.authController),
    });
    fastify.get("/csrf-token", {
      schema: {
        response: {
          200: CsrfTokenResponse,
        },
      },
      handler: this.authController.csrfToken.bind(this.authController),
    });
    fastify.post("/refresh-token", {
      handler: this.authController.refreshToken.bind(this.authController),
    });
    fastify.post("/logout", {
      handler: this.authController.logout.bind(this.authController),
    });
  }
}
