import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ImmersiveNav from '../components/ImmersiveNav';
import HeroSection from '../components/HeroSection';
import TelemetrySection from '../components/TelemetrySection';
import LiveTimingSection from '../components/LiveTimingSection';
import StatisticsSection from '../components/StatisticsSection';
import ChampionshipSection from '../components/ChampionshipSection';
import TracksSection from '../components/TracksSection';
import AnatomySection from '../components/AnatomySection';

gsap.registerPlugin(ScrollTrigger);

export default function HomePageImmersive() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const sections = gsap.utils.toArray('.section');
    
    // Snap scroll configuration
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      snap: {
        snapTo: 1 / (sections.length - 1),
        duration: 0.5,
        ease: 'power2.inOut',
      },
    });

    // Track current section
    sections.forEach((section: any, index) => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setCurrentSection(index),
        onEnterBack: () => setCurrentSection(index),
      });
    });

    // Show navbar after first section
    ScrollTrigger.create({
      trigger: '.section',
      start: 'bottom top',
      onEnter: () => setShowNav(true),
      onLeaveBack: () => setShowNav(false),
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const scrollToSection = (index: number) => {
    const sections = gsap.utils.toArray('.section');
    if (sections[index]) {
      gsap.to(window, {
        scrollTo: { y: sections[index] as HTMLElement, offsetY: 0 },
        duration: 1,
        ease: 'power2.inOut',
      });
    }
  };

  return (
    <>
      <SEO
        path="/"
        title="METRIK DELTA - Professional F1 Telemetry Analysis"
        description="Professional F1 telemetry analysis platform with detailed charts, GPS animations, pit wall strategy and championship data 2018-2026."
        keywords="f1 telemetry, formula 1 analysis, f1 data, f1 standings, f1 results, télémétrie f1, analyse f1, telemetría f1"
      />
    <div ref={containerRef} className="bg-metrik-black">
      {/* Navbar qui apparaît au scroll */}
      <ImmersiveNav 
        show={showNav} 
        currentSection={currentSection}
        onNavigate={scrollToSection}
      />

      {/* Section indicators (side dots) */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <button
            key={index}
            onClick={() => scrollToSection(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentSection === index
                ? 'bg-metrik-turquoise scale-150 shadow-lg shadow-metrik-turquoise/50'
                : 'bg-gray-600 hover:bg-gray-400'
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Sections */}
      <div className="snap-y snap-mandatory h-screen overflow-y-scroll scroll-smooth">
        <HeroSection navigate={navigate} />
        <TelemetrySection navigate={navigate} />
        <LiveTimingSection navigate={navigate} />
        <StatisticsSection navigate={navigate} />
        <ChampionshipSection navigate={navigate} />
        <TracksSection navigate={navigate} />
        <AnatomySection navigate={navigate} />
      </div>
    </div>
    </>
  );
}