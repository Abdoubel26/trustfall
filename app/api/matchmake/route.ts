import { NextResponse } from "next/server";
import Pusher from "pusher";


const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.PUSHER_APP_CLUSTER!,
  useTLS: true
});

interface WaitingPlayer {
  playerId: string;
}

let waitingPlayer: WaitingPlayer | null = null;


export async function POST(req: Request){


    try {

        const { playerId } = await req.json()

        if(!playerId){
            return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
        }

        if (waitingPlayer && waitingPlayer.playerId === playerId) {
            return NextResponse.json({ status: "waiting", message: "Already in queue" });
        }
        
        if (!waitingPlayer) {
      waitingPlayer = { playerId };
      
      return NextResponse.json({ 
        status: "waiting", 
        message: "Added to queue. Waiting for an opponent..." 
      });
    }

    const opponentId = waitingPlayer.playerId;
    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;

    waitingPlayer = null;

    await pusher.trigger(`user-${opponentId}`, "match-found", {
      roomId,
      opponentId: playerId, 
    });

    return NextResponse.json({
      status: "matched",
      roomId,
      opponentId,
    })

    }
    catch(e){
        if(Error.isError(e)){
            console.error("Matchmaking error:", e);
            return NextResponse.json({ error: `Internal server error: ${e.message ? e.message : ""}` }, { status: 500 });
        }
    }
}
