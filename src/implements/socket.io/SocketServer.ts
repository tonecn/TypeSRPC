import { SocketServer as SocketServerBase, SocketServerBaseEvents } from "@/core/SocketServer";
import { EventEmitter } from "@/utils/EventEmitter";
import { SocketConnection } from "./SocketConnection";

interface SocketServerEvents extends SocketServerBaseEvents {

}

export class SocketServer extends EventEmitter<SocketServerEvents> implements SocketServerBase {

    public async listen(options: { port: number; }): Promise<void> {
        const { port } = options;
        /** only run it */
        const { Server } = await import("socket.io");
        const io = new Server();

        io.on('connection', socket => {
            const conn = new SocketConnection({
                sendMethod: (data) => {
                    socket.emit('s', data);
                },
                closeMethod: () => {
                    socket.conn.close();
                }
            });

            socket.on('disconnect', (reason, description) => {
                conn.emit('closed', reason);
            })

            /** subscribe messages from client */
            socket.on('c', (data) => {
                conn.emit('msg', data);
            })

            this.emit('connect', conn);
        })

        io.listen(port);
    }

}
