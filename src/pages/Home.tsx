import { Comments, Information, Stations } from "@/components"

const Home = () => {
  return (
    <div className="flex gap-2 justify-between p-2 mx-auto h-dvh">
      <Stations/>
      <Information/>
      <Comments/>
    </div>
  )
}

export default Home
