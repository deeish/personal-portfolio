import React from "react";
import InfoBox from "../../components/InfoBox/InfoBox";
import "./Home.css";

function Home() {
  return (
    <div className="home-container">
      <div className="header-container">
        <div className="headertext-container">
          <h1>Dylan Salmo</h1>
          <h1 className="sub-title">Software Developer</h1>
        </div>
      </div>
      <div className="info-box-container">
      <InfoBox
          title="Documents"
          items={[{ content: "Resume", link: "/resume.pdf" }]} 
        />
        <InfoBox
          title="Work"
          items={[
            { content: "GitHub", link: "https://github.com/deeish" },
            {
              content: "LinkedIn",
              link: "https://www.linkedin.com/in/dylan-salmo-86a526236/",
            },
          ]}
        />
        <InfoBox
          title="Socials"
          items={[
            { content: "X", link: "https://twitter.com/SalmoDylan" },
            {
              content: "Instagram",
              link: "https://www.instagram.com/deeish_1/",
            },
          ]}
        />
      </div>
    </div>
  );
}

export default Home;
