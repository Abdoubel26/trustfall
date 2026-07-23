async function runAI(prompt: string, model: string): Promise<string> {
  try {
    const res = await fetch("/api/ai/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, model }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("API Error:", error);
      throw new Error(error.error || `Server error: ${res.status}`);
    }

    const data = await res.json();
    console.log("Response received successfully");
    return data.text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
}

export default runAI;