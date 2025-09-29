// env.mjs
import { Buffer } from "node:buffer"

export const env = {
  API_URL: process.env.VITE_API_URL || "http://localhost:3000",
  SECRET_KEY: Buffer.from("some-secret").toString("base64"), // Line 12 fixed
}
