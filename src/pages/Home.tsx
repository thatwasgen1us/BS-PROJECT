import { Comments, Information, Stations } from "@/components"

const Home = () => {
  return (
    <div className="container flex justify-between mx-auto">
      <Stations/>
      <Information/>
      <Comments/>
    </div>
  )
}

export default Home
