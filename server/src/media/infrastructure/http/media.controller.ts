import "@fastify/multipart";
import { FastifyReply, FastifyRequest } from "fastify";
import { Static } from "typebox";
import { MediaType } from "@/media/domain/media.domain.ts";
import { IMediaUsecase } from "@/media/application/media.usecase.ts";
import { IAuthService } from "@/auth/contracts/services/auth.interface.ts";
import { FileNotFoundError } from "@/media/errors/media.errors.ts";
import { getAuthPayload } from "@/shared/utility/getAuthPayload.ts";
import { MediaIdParams } from "./media.schema.ts";
import { PaginationQueryString } from "@/shared/types/pagination.types.ts";

export class MediaController {
  constructor(
    private readonly mediaUsecase: IMediaUsecase,
    private readonly authService: IAuthService
  ) {}

  async upload(request: FastifyRequest, reply: FastifyReply) {
    const file = await request.file();
    if (!file) {
      throw new FileNotFoundError();
    }
    const payload = await getAuthPayload(request, this.authService);

    const media = await this.mediaUsecase.upload({
      owner_id: payload.user_id,
      media_type: this.resolveMediaType(file.mimetype),
      mime_type: file.mimetype,
      original_name: file.filename,
      stream: file.file,
    });
    request.log
      .child({ userId: payload.user_id, mediaId: media.id })
      .info("Media uploaded");
    return reply.status(201).send(media);
  }
  async execute(
    request: FastifyRequest<{ Params: Static<typeof MediaIdParams> }>,
    reply: FastifyReply
  ) {
    const { mediaId } = request.params;
    const rawRange = request.headers.range;
    const range = typeof rawRange === "string" ? rawRange : rawRange?.[0];
    const payload = await getAuthPayload(request, this.authService);
    const media = await this.mediaUsecase.execute({
      mediaId,
      userId: payload.user_id,
      ...(range !== undefined ? { range } : {}),
    });
    return reply
      .status(media.statusCode)
      .headers(media.headers)
      .send(media.stream);
  }

  async getAllItems(
    request: FastifyRequest<{
      Querystring: Static<typeof PaginationQueryString>;
    }>,
    reply: FastifyReply
  ) {
    const { limit = 20, offset = 0 } = request.query;
    await getAuthPayload(request, this.authService);
    const media = await this.mediaUsecase.getAllItems(limit, offset);
    return reply.status(200).send(media);
  }

  async delete(
    request: FastifyRequest<{ Params: Static<typeof MediaIdParams> }>,
    reply: FastifyReply
  ) {
    const { mediaId } = request.params;
    const payload = await getAuthPayload(request, this.authService);
    await this.mediaUsecase.delete(mediaId, payload.user_id);
    request.log
      .child({ userId: payload.user_id, mediaId })
      .info("Media deleted");
    return reply.status(204).send();
  }
  private resolveMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith("audio/")) {
      return "audio";
    }
    return "video";
  }
}
