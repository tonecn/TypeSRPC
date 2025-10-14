import { injectSocketClient } from "@/core/SocketClient";
import { SocketClient } from "./SocketClient";
import { injectSocketServer } from "@/core/SocketServer";
import { SocketServer } from "./SocketServer";

export function injectSocketIOImplements() {
    injectSocketClient(SocketClient);
    injectSocketServer(SocketServer);
}