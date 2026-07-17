import Pusher from "pusher";


const pusher = new Pusher({
    appId: process.env.PUSHER_ID!,
    secret: process.env.PUSHER_SECRECT!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
})


export const POST = async (req: Request) => {


    const users = []

    const { userId } = await req.json()
}