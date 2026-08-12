import { AUTH_MODES } from '../constant';

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES];
