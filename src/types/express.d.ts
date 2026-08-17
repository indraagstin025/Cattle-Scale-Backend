import { Device, WebSession } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      device?: Device;
      webSession?: WebSession;
    }
  }
}

export {};
