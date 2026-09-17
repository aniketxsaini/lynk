
import { JwtPayload } from "jsonwebtoken";
export interface lynkJwtPayload extends JwtPayload{
    userId:string;
}