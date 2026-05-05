import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main>
      <p className="eyebrow">Geography Globe</p>
      <h1>Hello, world.</h1>
      <p>This is a React deploy test for the future country globe app.</p>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
