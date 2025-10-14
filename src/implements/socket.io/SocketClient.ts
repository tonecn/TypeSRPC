import { SocketClient as SocketClientBase } from "@/core/SocketClient";
import { io } from "socket.io-client";
import { SocketConnection } from "./SocketConnection";

export class SocketClient implements SocketClientBase {

    public async connect(url: string): Promise<SocketConnection> {
        return new Promise((resolve, reject) => {
            const socket = io(url, {
                autoConnect: false,
                reconnection: false,
            });

            const conn = new SocketConnection({
                sendMethod: (data) => {
                    socket.emit('c', data);
                },
                closeMethod: () => {
                    socket.close();
                }
            });

            socket.on('connect', () => {
                resolve(conn);
            });

            socket.on('disconnect', (reason, description) => {
                conn.emit('closed', reason);
            })

            /** subscribe messages from server */
            socket.on('s', (data) => {
                conn.emit('msg', data);
            })

            socket.connect();
        })
    }

}