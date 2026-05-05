import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Globe from "react-globe.gl";
import { feature } from "topojson-client";
import { geoCentroid } from "d3-geo";
import { Check, Crosshair, Globe2, RotateCcw, Search, Star } from "lucide-react";
import world from "world-atlas/countries-110m.json";
import "./styles.css";

const STORAGE_KEY = "geography-globe-progress-v1";

const COUNTRY_META = [
  ["United States of America", "North America", "Washington, D.C.", "Home base: huge, central North America.", 5],
  ["Canada", "North America", "Ottawa", "The giant country directly above the U.S.", 5],
  ["Mexico", "North America", "Mexico City", "Directly south of the U.S.; the bridge into Latin America.", 5],
  ["Brazil", "South America", "Brasilia", "The massive country that owns eastern South America.", 5],
  ["Argentina", "South America", "Buenos Aires", "Long country at the bottom of South America.", 4],
  ["Colombia", "South America", "Bogota", "Top-left corner of South America near Panama.", 4],
  ["Chile", "South America", "Santiago", "The skinny country down South America's Pacific edge.", 4],
  ["Peru", "South America", "Lima", "West side of South America, above Chile.", 4],
  ["United Kingdom", "Europe", "London", "Island northwest of mainland Europe.", 5],
  ["France", "Europe", "Paris", "Western Europe, between Spain and Germany.", 5],
  ["Germany", "Europe", "Berlin", "Central Europe's anchor.", 5],
  ["Spain", "Europe", "Madrid", "Large country on the Iberian Peninsula.", 5],
  ["Italy", "Europe", "Rome", "The boot-shaped country in the Mediterranean.", 5],
  ["Netherlands", "Europe", "Amsterdam", "Small coastal country west of Germany.", 4],
  ["Switzerland", "Europe", "Bern", "Small landlocked country in the Alps.", 4],
  ["Portugal", "Europe", "Lisbon", "West edge of Iberia, next to Spain.", 4],
  ["Ireland", "Europe", "Dublin", "Island west of Great Britain.", 4],
  ["Greece", "Europe", "Athens", "Southeast Europe with lots of islands.", 4],
  ["Poland", "Europe", "Warsaw", "East of Germany, west of Ukraine.", 4],
  ["Ukraine", "Europe", "Kyiv", "Large country north of the Black Sea.", 5],
  ["Russia", "Europe/Asia", "Moscow", "Huge country across eastern Europe and northern Asia.", 5],
  ["Norway", "Europe", "Oslo", "Long western edge of Scandinavia.", 4],
  ["Sweden", "Europe", "Stockholm", "Tall Scandinavian country east of Norway.", 4],
  ["Turkey", "Europe/Asia", "Ankara", "Connects Europe and Asia; south of the Black Sea.", 5],
  ["China", "Asia", "Beijing", "Huge East Asian country west of Korea and Japan.", 5],
  ["Japan", "Asia", "Tokyo", "Island chain east of Korea and China.", 5],
  ["South Korea", "Asia", "Seoul", "Southern half of the Korean peninsula.", 5],
  ["India", "Asia", "New Delhi", "Large triangle-shaped country in South Asia.", 5],
  ["Indonesia", "Asia", "Jakarta", "Huge island nation between Asia and Australia.", 5],
  ["Thailand", "Asia", "Bangkok", "Southeast Asia, west of Vietnam.", 4],
  ["Vietnam", "Asia", "Hanoi", "Long S-shaped country on Southeast Asia's coast.", 4],
  ["Philippines", "Asia", "Manila", "Island nation east of Vietnam.", 4],
  ["Malaysia", "Asia", "Kuala Lumpur", "Split between a peninsula and northern Borneo.", 4],
  ["Singapore", "Asia", "Singapore", "Tiny city-state at the tip of Malaysia.", 4],
  ["Pakistan", "Asia", "Islamabad", "West of India.", 4],
  ["Bangladesh", "Asia", "Dhaka", "East of India on the Bay of Bengal.", 4],
  ["Australia", "Oceania", "Canberra", "The giant island continent.", 5],
  ["New Zealand", "Oceania", "Wellington", "Two islands southeast of Australia.", 4],
  ["Egypt", "Africa", "Cairo", "Northeast Africa, where the Nile meets the Mediterranean.", 5],
  ["South Africa", "Africa", "Pretoria", "At the southern tip of Africa.", 5],
  ["Nigeria", "Africa", "Abuja", "West Africa's population giant.", 5],
  ["Kenya", "Africa", "Nairobi", "East Africa, on the Indian Ocean.", 4],
  ["Morocco", "Africa", "Rabat", "Northwest Africa, just south of Spain.", 4],
  ["Ethiopia", "Africa", "Addis Ababa", "Horn of Africa, landlocked east side.", 4],
  ["Ghana", "Africa", "Accra", "West Africa, on the Gulf of Guinea.", 3],
  ["Saudi Arabia", "Middle East", "Riyadh", "Largest country on the Arabian Peninsula.", 5],
  ["Iran", "Middle East", "Tehran", "East of Iraq, south of the Caspian Sea.", 5],
  ["Israel", "Middle East", "Jerusalem", "Small country on the eastern Mediterranean.", 5],
  ["United Arab Emirates", "Middle East", "Abu Dhabi", "Small Gulf country with Dubai.", 4],
  ["Iraq", "Middle East", "Baghdad", "Between Syria, Iran, Turkey, and Saudi Arabia.", 4],
  ["Jordan", "Middle East", "Amman", "East of Israel, north of Saudi Arabia.", 3],
];

const metaByName = new Map(
  COUNTRY_META.map(([name, continent, capital, hook, priority]) => [
    name,
    { name, continent, capital, hook, priority },
  ]),
);

const loadProgress = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const saveProgress = (progress) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function App() {
  const globeRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);
  const mexicoTapCount = useRef(0);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");
  const [mode, setMode] = useState("learn");
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState("Choose a country.");
  const [progress, setProgress] = useState(loadProgress);

  const countries = useMemo(() => {
    const geo = feature(world, world.objects.countries).features;
    return geo.map((country) => {
      const name = country.properties.name;
      const center = geoCentroid(country);
      return {
        ...country,
        properties: {
          ...country.properties,
          center: { lng: center[0], lat: center[1] },
          meta: metaByName.get(name),
        },
      };
    });
  }, []);

  const studyCountries = useMemo(
    () =>
      countries
        .filter((country) => country.properties.meta)
        .sort((a, b) => {
          const ap = a.properties.meta.priority;
          const bp = b.properties.meta.priority;
          return bp - ap || a.properties.name.localeCompare(b.properties.name);
        }),
    [countries],
  );

  const regions = useMemo(
    () => ["All", ...new Set(studyCountries.map((country) => country.properties.meta.continent))],
    [studyCountries],
  );

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return studyCountries.filter((country) => {
      const meta = country.properties.meta;
      const regionMatch = region === "All" || meta.continent === region;
      const queryMatch =
        !normalizedQuery ||
        meta.name.toLowerCase().includes(normalizedQuery) ||
        meta.capital.toLowerCase().includes(normalizedQuery);
      return regionMatch && queryMatch;
    });
  }, [query, region, studyCountries]);

  const stats = useMemo(() => {
    const entries = studyCountries.map((country) => progress[country.properties.name] || {});
    const correct = entries.reduce((sum, item) => sum + (item.correct || 0), 0);
    const wrong = entries.reduce((sum, item) => sum + (item.wrong || 0), 0);
    const practiced = entries.filter((item) => item.seen).length;
    return { correct, wrong, practiced };
  }, [progress, studyCountries]);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const syncMedia = () => setIsCompact(media.matches);
    syncMedia();
    media.addEventListener("change", syncMedia);
    return () => media.removeEventListener("change", syncMedia);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.renderer()?.setPixelRatio?.(isCompact ? 1 : Math.min(window.devicePixelRatio || 1, 1.35));
    globeRef.current.controls().autoRotate = !isCompact;
    globeRef.current.controls().autoRotateSpeed = 0.35;
    globeRef.current.pointOfView({ lat: 18, lng: 12, altitude: isCompact ? 2.75 : 2.35 }, 0);
  }, [isCompact]);

  const focusCountry = (country, nextMode = mode) => {
    setSelected(country);
    const { lat, lng } = country.properties.center;
    globeRef.current?.pointOfView({ lat, lng, altitude: 1.55 }, 900);
    if (nextMode === "learn") {
      setMessage(country.properties.meta.hook);
      setProgress((current) => ({
        ...current,
        [country.properties.name]: {
          ...(current[country.properties.name] || {}),
          seen: true,
          lastSeen: Date.now(),
        },
      }));
    }
  };

  const startQuiz = () => {
    const pool = shuffle(filteredCountries.length >= 6 ? filteredCountries : studyCountries);
    const nextTarget = pool[0];
    setMode("quiz");
    setTarget(nextTarget);
    setSelected(null);
    setMessage(`Find ${nextTarget.properties.meta.name}.`);
    const { lat, lng } = nextTarget.properties.center;
    globeRef.current?.pointOfView({ lat: lat > 0 ? 24 : -18, lng: lng + 45, altitude: 2.1 }, 800);
  };

  const markAnswer = (country) => {
    if (!target) return;
    const isCorrect = country.properties.name === target.properties.name;
    setSelected(country);
    setProgress((current) => {
      const previous = current[target.properties.name] || {};
      return {
        ...current,
        [target.properties.name]: {
          ...previous,
          seen: true,
          correct: (previous.correct || 0) + (isCorrect ? 1 : 0),
          wrong: (previous.wrong || 0) + (isCorrect ? 0 : 1),
          lastSeen: Date.now(),
        },
      };
    });

    if (isCorrect) {
      setMessage("Correct.");
      window.setTimeout(startQuiz, 850);
    } else {
      setMessage(`That was ${country.properties.meta.name}.`);
    }
  };

  const handleCountryClick = (country) => {
    if (!country.properties.meta) return;
    if (country.properties.name === "Mexico") {
      mexicoTapCount.current += 1;
      if (mexicoTapCount.current === 5) {
        setMode("learn");
        setTarget(null);
        setSelected(country);
        setMessage("Hi Jolie 😃");
        mexicoTapCount.current = 0;
        return;
      }
    } else {
      mexicoTapCount.current = 0;
    }

    if (mode === "quiz") {
      markAnswer(country);
      return;
    }
    focusCountry(country, "learn");
  };

  const resetProgress = () => {
    setProgress({});
    setMessage("Progress reset. Start fresh.");
  };

  const activeName = selected?.properties.name;

  return (
    <div className="app-shell">
      <section className="globe-panel">
        <div className="topbar">
          <div>
            <p className="eyebrow">Geography Globe</p>
            <h1>Geography</h1>
          </div>
          <div className="mode-controls" aria-label="Mode controls">
            <button className={mode === "learn" ? "active" : ""} onClick={() => setMode("learn")}>
              <Globe2 size={17} /> Learn
            </button>
            <button className={mode === "quiz" ? "active" : ""} onClick={startQuiz}>
              <Crosshair size={17} /> Quiz
            </button>
          </div>
        </div>

        <div className="globe-wrap">
          <Globe
            ref={globeRef}
            animateIn={false}
            rendererConfig={{ antialias: !isCompact, alpha: true, powerPreference: "high-performance" }}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            polygonsData={studyCountries}
            polygonAltitude={(country) =>
              country.properties.name === activeName ? 0.045 : 0.012
            }
            polygonCapColor={(country) => {
              if (!country.properties.meta) return "rgba(236, 231, 218, 0.16)";
              if (country.properties.name === activeName) return "rgba(232, 169, 74, 0.92)";
              return "rgba(80, 160, 138, 0.58)";
            }}
            polygonSideColor={() => "rgba(16, 43, 42, 0.25)"}
            polygonStrokeColor={(country) =>
              country.properties.name === hovered?.properties.name ? "#ffffff" : "rgba(255,255,255,0.36)"
            }
            polygonLabel={(country) =>
              country.properties.meta
                ? `<b>${country.properties.meta.name}</b><br/>${country.properties.meta.capital}`
                : country.properties.name
            }
            onPolygonHover={setHovered}
            onPolygonClick={handleCountryClick}
            atmosphereColor="#bde7ee"
            atmosphereAltitude={isCompact ? 0.08 : 0.14}
          />
        </div>
      </section>

      <aside className="side-panel">
        <div className="status-card">
          <p className="label">{mode === "quiz" ? "Quiz" : "Note"}</p>
          <h2>{message}</h2>
          {selected?.properties.meta && (
            <dl>
              <div>
                <dt>Capital</dt>
                <dd>{selected.properties.meta.capital}</dd>
              </div>
              <div>
                <dt>Region</dt>
                <dd>{selected.properties.meta.continent}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="stats-grid">
          <div>
            <strong>{stats.practiced}</strong>
            <span>Seen</span>
          </div>
          <div>
            <strong>{stats.correct}</strong>
            <span>Correct</span>
          </div>
          <div>
            <strong>{stats.wrong}</strong>
            <span>Misses</span>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or capital"
            />
          </div>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {regions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="list-head">
          <span>{filteredCountries.length} focus countries</span>
          <button onClick={resetProgress}>
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        <div className="country-list">
          {filteredCountries.map((country) => {
            const meta = country.properties.meta;
            const record = progress[meta.name] || {};
            return (
              <button
                key={meta.name}
                className={activeName === meta.name ? "country-row selected" : "country-row"}
                onClick={() => handleCountryClick(country)}
              >
                <span className="priority">
                  <Star size={14} fill={meta.priority >= 5 ? "currentColor" : "none"} />
                </span>
                <span>
                  <strong>{meta.name}</strong>
                  <small>{meta.capital} · {meta.continent}</small>
                </span>
                {record.correct > 0 && (
                  <span className="checkmark">
                    <Check size={15} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
