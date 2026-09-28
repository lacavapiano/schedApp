import { useEffect } from "react";
import { getPianos } from "../services/api";

function Test() {
  useEffect(() => {
    getPianos()
      .then((data) => {
        console.log("PIANOS:", data);
      })
      .catch((error) => {
        console.error("PIANO ERROR:", error);
      });
  }, []);

  return (
    <div>
      <h1>Piano API Test</h1>
      <p>Check the browser console for the piano data.</p>
    </div>
  );
}

export default Test;