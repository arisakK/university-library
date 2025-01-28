import BookList from "@/components/BookList";
import BookOverview from "@/components/BookOverview";
import { sampleBooks } from "@/constants";

const Home = async () => {
  // const result = await db.selete().from(books).limit(10).all();
  return (
    <>
      <BookOverview {...sampleBooks[0]} />

      <BookList title="Latest" books={sampleBooks} containerClassName="mt-28" />
    </>
  );
};

export default Home;
