import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import ScrollReveal from "@/components/ScrollReveal";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": "https://danielhipskind.com/#profilepage",
      url: "https://danielhipskind.com/",
      name: "Daniel Hipskind | Software Engineer & Founder of Greigh Studios",
      isPartOf: { "@id": "https://danielhipskind.com/#website" },
      mainEntity: { "@id": "https://danielhipskind.com/#person" },
      inLanguage: "en-US",
    },
    {
      "@type": "WebSite",
      "@id": "https://danielhipskind.com/#website",
      url: "https://danielhipskind.com/",
      name: "Daniel Hipskind",
      publisher: { "@id": "https://danielhipskind.com/#person" },
      inLanguage: "en-US",
    },
    {
      "@type": "Person",
      "@id": "https://danielhipskind.com/#person",
      name: "Daniel Hipskind",
      alternateName: "Greigh",
      jobTitle: "Software Engineer",
      url: "https://danielhipskind.com/",
      image: "https://danielhipskind.com/assets/images/DanielPortfolio.webp",
      email: "mailto:me@danielhipskind.com",
      worksFor: { "@id": "https://danielhipskind.com/#greighstudios" },
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "Grand Rapids Community College",
      },
      knowsAbout: [
        "React",
        "Next.js",
        "TypeScript",
        "JavaScript",
        "Node.js",
        "Flutter",
        "Dart",
        "Swift",
        "Kotlin",
        "MongoDB",
      ],
      sameAs: [
        "https://github.com/greigh",
        "https://linkedin.com/in/danielhipskind",
        "https://sensecast.app",
      ],
    },
    {
      "@type": "Organization",
      "@id": "https://danielhipskind.com/#greighstudios",
      name: "Greigh Studios LLC",
      url: "https://danielhipskind.com/",
      description: "Independent software studio founded by Daniel Hipskind.",
      founder: { "@id": "https://danielhipskind.com/#person" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://danielhipskind.com/#sensecast",
      name: "Sensecast",
      url: "https://sensecast.app",
      applicationCategory: "WeatherApplication",
      operatingSystem: "iOS, iPadOS, Android",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": "https://danielhipskind.com/#person" },
      publisher: { "@id": "https://danielhipskind.com/#greighstudios" },
      description:
        "A weather app that routes each forecast to the agency that actually models your terrain, explains every metric in plain language, and runs live tornado, power-grid, and storm trackers underneath the forecast.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://danielhipskind.com/#adamas",
      name: "Adamas",
      url: "https://danielhipskind.com/adamas/",
      applicationCategory: "UtilitiesApplication",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": "https://danielhipskind.com/#person" },
      publisher: { "@id": "https://danielhipskind.com/#greighstudios" },
      description:
        "A productivity toolkit for call center agents with hold timers, call flow guides, pattern formatters, and quick notes.",
    },
  ],
};

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <ScrollReveal>
        <About />
      </ScrollReveal>
      <ScrollReveal>
        <Projects />
      </ScrollReveal>
      <ScrollReveal>
        <Skills />
      </ScrollReveal>
    </main>
  );
}
