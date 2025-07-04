import React, { useEffect, useState } from "react";

const RESUME_URL = "https://rajeevxportfolio.netlify.app/documents/resume-rajeev-kumar.pdf";

const Resume = () => {
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    fetch("/data/sections/resume.json")
      .then((response) => response.json())
      .then((data) => setResumeData(data))
      .catch((error) => console.error("Error loading resume data:", error));
  }, []);

  if (!resumeData) return <p>Loading...</p>;

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>{resumeData.locales.en.title_long}</h2>
      <p>{resumeData.articles[0].locales.en.title}</p>

      <a
        href={RESUME_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          padding: "10px 20px",
          backgroundColor: "#28a745",
          color: "white",
          textDecoration: "none",
          borderRadius: "5px",
          fontSize: "16px",
          fontWeight: "bold",
          marginTop: "20px"
        }}
      >
        <i className="fa-solid fa-download" style={{ marginRight: "8px" }}></i>
        {resumeData.articles[0].items[0].locales.en.title}
      </a>
    </div>
  );
};

export default Resume;
