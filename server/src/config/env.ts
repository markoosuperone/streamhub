import envSchema from "env-schema";
import { type Static, Type } from "typebox";

export const LogLevel = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const schema = Type.Object({
  POSTGRES_URL: Type.String(),
  POSTGRES_PORT: Type.Number({ default: 5432 }),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_DB: Type.String(),
  DATABASE_URL: Type.String(),
  LOG_LEVEL: Type.Enum(LogLevel),
  HOST: Type.String({ default: "localhost" }),
  PORT: Type.Number({ default: 8000 }),
  JWT_ACCESS_EXPIRES_IN: Type.Number({ default: 3600 }), 
  JWT_REFRESH_EXPIRES_IN: Type.Number({ default: 86400 }),
  JWT_ACCESS_SECRET: Type.String(),
  JWT_REFRESH_SECRET: Type.String(),
  MAX_FILE_SIZE_BYTES: Type.Number({ default: 1024 * 1024 * 500 }), // 500 MB default
});

const env = envSchema<Static<typeof schema>>({
  dotenv: true,
  schema,
});

export default {
  postgres: {
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    host: env.POSTGRES_URL,
    database: env.POSTGRES_DB,
  },
  jwt: {
    access_secret: env.JWT_ACCESS_SECRET,
    refresh_secret: env.JWT_REFRESH_SECRET,
    access_expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refresh_expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  log: {
    level: env.LOG_LEVEL,
  },
  server: {
    host: env.HOST,
    port: env.PORT,
  },
  db: {
    url: env.DATABASE_URL,
  },
  media: {
    maxFileSizeBytes: env.MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: [
      // Audio
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/ogg",
      "audio/vorbis",
      "audio/wav",
      "audio/webm",
      "audio/flac",
      // Video
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
      "video/ogg",
      "video/x-matroska",
    ],
  },
};
