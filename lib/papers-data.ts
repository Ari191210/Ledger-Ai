export type Question = {
  q: string;
  opts: [string, string, string, string];
  ans: number;
  topic: string;
};

export type Paper = {
  id: string;
  board: "CBSE" | "ICSE" | "JEE" | "SAT" | "IB" | "NEET";
  subject: string;
  grade: string;
  year: number;
  difficulty: "Easy" | "Medium" | "Hard";
  questions: Question[];
};

export const PAPERS: Paper[] = [

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-12-phy-2024",
    board: "CBSE", subject: "Physics", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "A point charge q is placed at the centre of a cube. The electric flux through one face is:", opts: ["q/ε₀", "q/6ε₀", "q/24ε₀", "Zero"], ans: 1, topic: "Electrostatics" },
      { q: "Work done in moving a charge of 2 C across a potential difference of 5 V is:", opts: ["2.5 J", "5 J", "10 J", "0.4 J"], ans: 2, topic: "Electrostatics" },
      { q: "A convex lens (f = 20 cm) has object at 30 cm. Image distance is:", opts: ["60 cm", "−60 cm", "15 cm", "−15 cm"], ans: 0, topic: "Optics" },
      { q: "In the photoelectric effect, stopping potential is independent of:", opts: ["Frequency of light", "Intensity of light", "Material of cathode", "Nature of emitted electrons"], ans: 1, topic: "Modern Physics" },
      { q: "de Broglie wavelength of electron at 10⁶ m/s is approximately:", opts: ["7.3 Å", "0.73 Å", "73 Å", "0.073 Å"], ans: 1, topic: "Modern Physics" },
      { q: "In a series LCR circuit at resonance, impedance equals:", opts: ["R", "√(R²+XL²)", "XL − XC", "Zero"], ans: 0, topic: "Alternating Current" },
      { q: "A parallel plate capacitor: plate separation halved, area doubled. New capacitance is:", opts: ["C/2", "C", "2C", "4C"], ans: 3, topic: "Electrostatics" },
      { q: "Drift velocity of electrons in a conductor is of the order:", opts: ["10⁸ m/s", "10⁶ m/s", "10⁻³ m/s", "10⁻¹⁰ m/s"], ans: 2, topic: "Current Electricity" },
      { q: "A transformer has 100 primary turns, 1000 secondary turns, primary voltage 220 V. Secondary voltage:", opts: ["22 V", "220 V", "2200 V", "22000 V"], ans: 2, topic: "Electromagnetic Induction" },
      { q: "Energy of a photon of wavelength 660 nm is approximately:", opts: ["1.0 eV", "1.9 eV", "2.5 eV", "3.0 eV"], ans: 1, topic: "Modern Physics" },
    ],
  },

  {
    id: "cbse-12-phy-2023",
    board: "CBSE", subject: "Physics", grade: "Class 12", year: 2023, difficulty: "Medium",
    questions: [
      { q: "The electric field inside a hollow conducting sphere is:", opts: ["Maximum at centre", "Zero everywhere", "Equal to surface field", "Non-uniform"], ans: 1, topic: "Electrostatics" },
      { q: "Resistivity of a conductor depends on:", opts: ["Length", "Area of cross-section", "Material and temperature", "Applied voltage"], ans: 2, topic: "Current Electricity" },
      { q: "The unit of magnetic flux is:", opts: ["Tesla", "Weber", "Gauss", "Ampere"], ans: 1, topic: "Magnetism" },
      { q: "Which mirror gives an erect, diminished virtual image for all object positions?", opts: ["Concave mirror", "Convex mirror", "Plane mirror", "Parabolic mirror"], ans: 1, topic: "Optics" },
      { q: "In nuclear fission, the energy released is due to:", opts: ["Chemical bonding", "Mass defect", "Electron transitions", "Gravitational potential"], ans: 1, topic: "Atoms & Nuclei" },
      { q: "The frequency of a photon whose energy is 6.63 × 10⁻³⁴ J is:", opts: ["1 Hz", "1 kHz", "1 MHz", "1 GHz"], ans: 0, topic: "Modern Physics" },
      { q: "A p-n junction diode in forward bias has:", opts: ["High resistance", "Low resistance", "No current flow", "Breakdown"], ans: 1, topic: "Semiconductors" },
      { q: "Lenz's law is a direct consequence of:", opts: ["Newton's third law", "Conservation of charge", "Conservation of energy", "Faraday's first law"], ans: 2, topic: "Electromagnetic Induction" },
      { q: "The power dissipated in a resistor R carrying current I is:", opts: ["IR", "I²R", "IR²", "I/R"], ans: 1, topic: "Current Electricity" },
      { q: "Which colour of light travels slowest in glass?", opts: ["Violet", "Blue", "Red", "Yellow"], ans: 0, topic: "Optics" },
    ],
  },

  {
    id: "cbse-12-chem-2024",
    board: "CBSE", subject: "Chemistry", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "Molarity of a solution is defined as moles of solute per:", opts: ["kg of solvent", "litre of solution", "kg of solution", "100 g of solvent"], ans: 1, topic: "Solutions" },
      { q: "Kohlrausch's law relates to:", opts: ["Vapour pressure", "Molar conductivity at infinite dilution", "Osmotic pressure", "Freezing point depression"], ans: 1, topic: "Electrochemistry" },
      { q: "Which of the following is an example of a first-order reaction?", opts: ["H₂ + I₂ → 2HI", "Decomposition of N₂O₅", "2NO + O₂ → 2NO₂", "Formation of SO₃"], ans: 1, topic: "Chemical Kinetics" },
      { q: "Adsorption of gas on solid surface is generally:", opts: ["Endothermic", "Exothermic", "Neutral", "Depends on gas only"], ans: 1, topic: "Surface Chemistry" },
      { q: "Which of the following is a bidentate ligand?", opts: ["NH₃", "Cl⁻", "en (ethylenediamine)", "H₂O"], ans: 2, topic: "Coordination Compounds" },
      { q: "The IUPAC name of CHCl₃ is:", opts: ["Chloroform", "Trichloromethane", "Carbon trichloride", "Methyl trichloride"], ans: 1, topic: "Haloalkanes" },
      { q: "Lucas test is used to distinguish between:", opts: ["Primary and secondary alcohols", "Alcohols and phenols", "Aldehydes and ketones", "Acids and esters"], ans: 0, topic: "Alcohols" },
      { q: "The reagent used to convert a nitrile to primary amine is:", opts: ["LiAlH₄", "NaBH₄", "H₂/Pd", "Zn/HCl"], ans: 0, topic: "Amines" },
      { q: "Which of the following is a reducing sugar?", opts: ["Sucrose", "Glucose", "Starch", "Cellulose"], ans: 1, topic: "Biomolecules" },
      { q: "Nylon-6,6 is formed from:", opts: ["Caprolactam", "Hexamethylenediamine and adipic acid", "Acrylonitrile", "Ethylene glycol"], ans: 1, topic: "Polymers" },
    ],
  },

  {
    id: "cbse-12-chem-2023",
    board: "CBSE", subject: "Chemistry", grade: "Class 12", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Which of the following is a secondary alcohol?", opts: ["CH₃OH", "CH₃CH₂OH", "(CH₃)₂CHOH", "(CH₃)₃COH"], ans: 2, topic: "Organic Chemistry" },
      { q: "The coordination number of Na⁺ in NaCl crystal is:", opts: ["4", "6", "8", "12"], ans: 1, topic: "Solid State" },
      { q: "Which noble gas is used in advertisement sign boards?", opts: ["He", "Ar", "Ne", "Kr"], ans: 2, topic: "p-Block Elements" },
      { q: "The IUPAC name of CH₃–CH(OH)–CH₃ is:", opts: ["Propan-1-ol", "Propan-2-ol", "1-methylethanol", "Isopropanol"], ans: 1, topic: "Organic Chemistry" },
      { q: "Raoult's law is applicable to:", opts: ["Ideal solutions", "Non-ideal solutions showing positive deviation", "Electrolyte solutions", "Supersaturated solutions"], ans: 0, topic: "Solutions" },
      { q: "The cell reaction in a Daniel cell is:", opts: ["Zn → Zn²⁺ + 2e⁻ (only)", "Cu²⁺ + 2e⁻ → Cu (only)", "Zn + Cu²⁺ → Zn²⁺ + Cu", "Cu + Zn²⁺ → Cu²⁺ + Zn"], ans: 2, topic: "Electrochemistry" },
      { q: "Which of the following shows the Tyndall effect?", opts: ["NaCl solution", "Sugar solution", "Gold sol (colloidal)", "Ethanol in water"], ans: 2, topic: "Surface Chemistry" },
      { q: "The EAN (effective atomic number) rule is associated with:", opts: ["Ionic compounds", "Coordination compounds", "Covalent hydrides", "Interstitial compounds"], ans: 1, topic: "Coordination Compounds" },
      { q: "Bakelite is formed from:", opts: ["Phenol and formaldehyde", "Urea and formaldehyde", "Styrene", "Vinyl chloride"], ans: 0, topic: "Polymers" },
      { q: "Vitamin C is also known as:", opts: ["Retinol", "Calciferol", "Ascorbic acid", "Tocopherol"], ans: 2, topic: "Biomolecules" },
    ],
  },

  {
    id: "cbse-12-math-2024",
    board: "CBSE", subject: "Mathematics", grade: "Class 12", year: 2024, difficulty: "Hard",
    questions: [
      { q: "If f(x) = sin⁻¹(x), then f′(x) equals:", opts: ["1/√(1−x²)", "−1/√(1−x²)", "1/(1+x²)", "cos⁻¹(x)"], ans: 0, topic: "Inverse Trigonometry" },
      { q: "The area bounded by y = x² and y = x is:", opts: ["1/6 sq. units", "1/3 sq. units", "1/2 sq. units", "1 sq. unit"], ans: 0, topic: "Integrals" },
      { q: "If A is a 3×3 matrix with |A| = 5, then |2A| equals:", opts: ["10", "20", "40", "80"], ans: 2, topic: "Matrices & Determinants" },
      { q: "The parabola with focus (0, 2) and directrix y = −2 has equation:", opts: ["x² = 4y", "x² = 8y", "y² = 8x", "x² = −8y"], ans: 1, topic: "Conics" },
      { q: "∫ eˣ(sin x + cos x) dx equals:", opts: ["eˣ sin x + C", "eˣ cos x + C", "eˣ(sin x − cos x) + C", "−eˣ cos x + C"], ans: 0, topic: "Integrals" },
      { q: "The derivative of tan⁻¹(1/x) with respect to x is:", opts: ["1/(1+x²)", "−1/(1+x²)", "x/(1+x²)", "1/x²"], ans: 1, topic: "Differentiation" },
      { q: "If the probability of an event is 0.6, probability of its complement is:", opts: ["0.6", "0.4", "1.6", "0.36"], ans: 1, topic: "Probability" },
      { q: "The vector equation of a line through (1,2,3) parallel to (2,−1,1) is:", opts: ["r = i+2j+3k + λ(2i−j+k)", "r = 2i−j+k + λ(i+2j+3k)", "r = i+j+k + λ(2i−j+k)", "r = (1+2)i+(2−1)j+(3+1)k"], ans: 0, topic: "3D Geometry" },
      { q: "The general solution of dy/dx + y = 0 is:", opts: ["y = Ce^x", "y = Ce^{-x}", "y = C cos x", "y = C sin x"], ans: 1, topic: "Differential Equations" },
      { q: "If A and B are mutually exclusive events with P(A) = 0.3 and P(B) = 0.4, then P(A∪B) is:", opts: ["0.12", "0.7", "0.58", "1"], ans: 1, topic: "Probability" },
    ],
  },

  {
    id: "cbse-12-math-2023",
    board: "CBSE", subject: "Mathematics", grade: "Class 12", year: 2023, difficulty: "Hard",
    questions: [
      { q: "The maximum value of f(x) = sin x + cos x is:", opts: ["1", "√2", "2", "√3"], ans: 1, topic: "Applications of Derivatives" },
      { q: "∫ dx/(1 + x²) equals:", opts: ["ln|1+x²| + C", "tan⁻¹(x) + C", "sin⁻¹(x) + C", "2x/(1+x²)² + C"], ans: 1, topic: "Integrals" },
      { q: "The cofactor of element 3 in matrix [[1,2],[3,4]] is:", opts: ["−2", "2", "4", "−4"], ans: 0, topic: "Matrices & Determinants" },
      { q: "If y = x^x, then dy/dx equals:", opts: ["x^x", "x^x · ln x", "x^x(1 + ln x)", "x^{x-1}"], ans: 2, topic: "Differentiation" },
      { q: "The relation R = {(a,a): a ∈ Z} is:", opts: ["Symmetric only", "Transitive only", "Reflexive only", "Equivalence relation"], ans: 3, topic: "Relations & Functions" },
      { q: "A die is thrown twice. Probability that sum is 7:", opts: ["1/36", "5/36", "6/36", "7/36"], ans: 2, topic: "Probability" },
      { q: "The angle between vectors a = i + j and b = j + k is:", opts: ["30°", "45°", "60°", "90°"], ans: 2, topic: "Vector Algebra" },
      { q: "∫₀^π sin x dx equals:", opts: ["0", "1", "2", "π"], ans: 2, topic: "Integrals" },
      { q: "The distance between planes 2x − y + 2z = 5 and 2x − y + 2z = 8 is:", opts: ["1", "3/5", "1/3", "3"], ans: 0, topic: "3D Geometry" },
      { q: "The inverse of matrix [[2,1],[1,1]] is:", opts: ["[[1,−1],[−1,2]]", "[[1,1],[1,2]]", "[[−1,1],[1,−2]]", "[[2,−1],[−1,1]]"], ans: 0, topic: "Matrices & Determinants" },
    ],
  },

  {
    id: "cbse-12-bio-2024",
    board: "CBSE", subject: "Biology", grade: "Class 12", year: 2024, difficulty: "Easy",
    questions: [
      { q: "The correct sequence of cell cycle phases is:", opts: ["G1 → S → G2 → M", "S → G1 → M → G2", "G1 → G2 → S → M", "M → G1 → S → G2"], ans: 0, topic: "Cell Division" },
      { q: "DNA replication occurs during:", opts: ["G1 phase", "S phase", "G2 phase", "M phase"], ans: 1, topic: "Cell Division" },
      { q: "The number of chromosomes in a human gamete is:", opts: ["46", "23", "22", "48"], ans: 1, topic: "Genetics" },
      { q: "Which enzyme is responsible for transcription?", opts: ["DNA polymerase", "RNA polymerase", "Helicase", "Ligase"], ans: 1, topic: "Molecular Biology" },
      { q: "Bt toxin is produced by:", opts: ["Bacillus thuringiensis", "Bacillus subtilis", "Agrobacterium tumefaciens", "Streptomyces"], ans: 0, topic: "Biotechnology" },
      { q: "The site of fertilisation in the human female reproductive tract is:", opts: ["Uterus", "Cervix", "Fallopian tube", "Ovary"], ans: 2, topic: "Human Reproduction" },
      { q: "Which of the following is a greenhouse gas?", opts: ["N₂", "O₂", "Ar", "CH₄"], ans: 3, topic: "Ecology" },
      { q: "The transfer of pollen from anther to stigma is called:", opts: ["Fertilisation", "Pollination", "Germination", "Embryogenesis"], ans: 1, topic: "Reproduction in Plants" },
      { q: "Down's syndrome is caused by trisomy of chromosome:", opts: ["13", "18", "21", "X"], ans: 2, topic: "Genetics" },
      { q: "Which enzyme cuts DNA at specific sequences?", opts: ["DNA polymerase", "Restriction endonuclease", "RNA polymerase", "Ligase"], ans: 1, topic: "Biotechnology" },
    ],
  },

  {
    id: "cbse-12-bio-2023",
    board: "CBSE", subject: "Biology", grade: "Class 12", year: 2023, difficulty: "Easy",
    questions: [
      { q: "Haemophilia is a sex-linked disorder. It is caused by a recessive allele on:", opts: ["X chromosome", "Y chromosome", "Autosome 8", "Autosome 13"], ans: 0, topic: "Genetics" },
      { q: "The primary productivity of an ecosystem depends mainly on:", opts: ["Consumers", "Decomposers", "Producers", "Detritivores"], ans: 2, topic: "Ecology" },
      { q: "Which of the following shows double fertilisation?", opts: ["Gymnosperms", "Angiosperms", "Bryophytes", "Pteridophytes"], ans: 1, topic: "Reproduction in Plants" },
      { q: "The hormone responsible for ovulation is:", opts: ["FSH", "LH", "Oestrogen", "Progesterone"], ans: 1, topic: "Human Reproduction" },
      { q: "PCR (Polymerase Chain Reaction) amplifies:", opts: ["Proteins", "RNA only", "Specific DNA sequences", "Entire genome"], ans: 2, topic: "Biotechnology" },
      { q: "The term 'Biodiversity hotspot' was coined by:", opts: ["E.O. Wilson", "Norman Myers", "Ernst Mayr", "R.H. Whittaker"], ans: 1, topic: "Ecology" },
      { q: "In Mendel's experiment, tallness (T) is dominant over dwarfness (t). Ratio in F2 from Tt × Tt:", opts: ["1:1", "1:2:1", "3:1", "1:1:1:1"], ans: 2, topic: "Genetics" },
      { q: "The genetic material in bacteriophage is:", opts: ["RNA only", "DNA only", "Both DNA and RNA", "Protein"], ans: 1, topic: "Molecular Biology" },
      { q: "Which of the following is an in-situ conservation method?", opts: ["Zoological park", "Seed bank", "National park", "Botanical garden"], ans: 2, topic: "Ecology" },
      { q: "Full form of MOET is:", opts: ["Multiple Ovulation Embryo Transfer", "Maternal Ovulation Embryo Transfer", "Multiple Ovum Egg Technology", "Modern Ovulation Embryo Technique"], ans: 0, topic: "Biotechnology" },
    ],
  },

  {
    id: "cbse-10-sci-2024",
    board: "CBSE", subject: "Science", grade: "Class 10", year: 2024, difficulty: "Easy",
    questions: [
      { q: "Which gas is evolved when zinc reacts with dilute sulphuric acid?", opts: ["O₂", "CO₂", "H₂", "SO₂"], ans: 2, topic: "Chemical Reactions" },
      { q: "The lens used to correct myopia is:", opts: ["Convex lens", "Concave lens", "Bifocal lens", "Cylindrical lens"], ans: 1, topic: "Light" },
      { q: "The pH of a neutral solution at 25°C is:", opts: ["0", "7", "14", "10"], ans: 1, topic: "Acids, Bases & Salts" },
      { q: "The alloy used in electrical fuses has a:", opts: ["High melting point", "Low melting point", "High resistance", "Low conductivity"], ans: 1, topic: "Electricity" },
      { q: "Which of the following is not a fossil fuel?", opts: ["Coal", "Petroleum", "Natural gas", "Wood"], ans: 3, topic: "Sources of Energy" },
      { q: "The phenomenon responsible for the twinkling of stars is:", opts: ["Reflection", "Refraction", "Dispersion", "Scattering"], ans: 1, topic: "Light" },
      { q: "In a food chain, the organisms that fix solar energy are:", opts: ["Consumers", "Decomposers", "Producers", "Omnivores"], ans: 2, topic: "Life Processes" },
      { q: "The metal that reacts most violently with cold water is:", opts: ["Iron", "Calcium", "Sodium", "Magnesium"], ans: 2, topic: "Metals & Non-metals" },
      { q: "The SI unit of electric current is:", opts: ["Volt", "Ohm", "Ampere", "Watt"], ans: 2, topic: "Electricity" },
      { q: "Which hormone regulates blood sugar level?", opts: ["Adrenaline", "Insulin", "Thyroxine", "Oestrogen"], ans: 1, topic: "Control & Coordination" },
    ],
  },

  {
    id: "cbse-10-math-2024",
    board: "CBSE", subject: "Mathematics", grade: "Class 10", year: 2024, difficulty: "Medium",
    questions: [
      { q: "The HCF of 144 and 198 is:", opts: ["9", "12", "18", "36"], ans: 2, topic: "Real Numbers" },
      { q: "The sum of first 20 natural numbers is:", opts: ["190", "200", "210", "220"], ans: 2, topic: "Arithmetic Progressions" },
      { q: "If sin θ = 3/5, then cos θ equals:", opts: ["4/5", "5/4", "3/4", "5/3"], ans: 0, topic: "Trigonometry" },
      { q: "The distance between points (2, 3) and (5, 7) is:", opts: ["3", "4", "5", "7"], ans: 2, topic: "Coordinate Geometry" },
      { q: "Volume of a cone of radius 7 cm and height 24 cm is:", opts: ["1232 cm³", "1232π/3 cm³", "1232 π cm³", "616π cm³"], ans: 0, topic: "Mensuration" },
      { q: "The discriminant of 2x² − 5x + 3 = 0 is:", opts: ["1", "25", "−1", "49"], ans: 0, topic: "Quadratic Equations" },
      { q: "If a pair of linear equations is consistent, it has:", opts: ["No solution", "Unique or infinite solutions", "Only infinite solutions", "Only unique solution"], ans: 1, topic: "Linear Equations" },
      { q: "The probability of getting a prime number when rolling a die is:", opts: ["1/2", "1/3", "2/3", "1/6"], ans: 0, topic: "Probability" },
      { q: "Tangent to a circle is perpendicular to the radius at the:", opts: ["Centre", "Point of tangency", "Midpoint of chord", "Circumference"], ans: 1, topic: "Circles" },
      { q: "The 10th term of AP 2, 5, 8, 11, … is:", opts: ["26", "28", "29", "32"], ans: 2, topic: "Arithmetic Progressions" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ICSE
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "icse-10-sci-2023",
    board: "ICSE", subject: "Science", grade: "Class 10", year: 2023, difficulty: "Easy",
    questions: [
      { q: "The process by which plants prepare their food using sunlight is called:", opts: ["Respiration", "Photosynthesis", "Transpiration", "Digestion"], ans: 1, topic: "Biology" },
      { q: "Which of the following is a renewable source of energy?", opts: ["Coal", "Petroleum", "Solar energy", "Natural gas"], ans: 2, topic: "Environment" },
      { q: "The chemical formula of baking soda is:", opts: ["NaCl", "NaOH", "Na₂CO₃", "NaHCO₃"], ans: 3, topic: "Chemistry" },
      { q: "Ohm's law holds when temperature is:", opts: ["Variable", "Constant", "Increasing", "Decreasing"], ans: 1, topic: "Physics" },
      { q: "Which gas is produced when zinc reacts with dilute HCl?", opts: ["Oxygen", "Carbon dioxide", "Hydrogen", "Nitrogen"], ans: 2, topic: "Chemistry" },
      { q: "The powerhouse of the cell is:", opts: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], ans: 2, topic: "Biology" },
      { q: "An object placed at the centre of curvature of a concave mirror forms an image:", opts: ["At focus, real, inverted", "At centre, real, inverted, same size", "Behind mirror, virtual, erect", "At infinity"], ans: 1, topic: "Physics" },
      { q: "The atomic number of an element is defined as:", opts: ["Number of neutrons", "Number of protons", "Mass number", "Number of electrons only"], ans: 1, topic: "Chemistry" },
      { q: "The nerve cell is also called:", opts: ["Nephron", "Neuron", "Neron", "Nucron"], ans: 1, topic: "Biology" },
      { q: "Rusting of iron is a:", opts: ["Physical change", "Chemical change", "Both", "Neither"], ans: 1, topic: "Chemistry" },
    ],
  },

  {
    id: "icse-10-math-2023",
    board: "ICSE", subject: "Mathematics", grade: "Class 10", year: 2023, difficulty: "Medium",
    questions: [
      { q: "The roots of x² − 5x + 6 = 0 are:", opts: ["2 and 3", "−2 and −3", "1 and 6", "−1 and −6"], ans: 0, topic: "Algebra" },
      { q: "If AP sum of n terms = 3n² + 5n, the common difference is:", opts: ["6", "5", "8", "3"], ans: 0, topic: "Arithmetic Progressions" },
      { q: "From 20 m away, angle of elevation of a tower is 60°. Height of tower:", opts: ["20√3 m", "20/√3 m", "40 m", "10√3 m"], ans: 0, topic: "Trigonometry" },
      { q: "Probability of getting a head in a coin toss:", opts: ["1", "0", "1/2", "1/4"], ans: 2, topic: "Probability" },
      { q: "Volume of a sphere of radius r:", opts: ["4πr²", "(4/3)πr³", "(2/3)πr³", "2πr³"], ans: 1, topic: "Mensuration" },
      { q: "The point of intersection of x = 3 and y = 4 is:", opts: ["(4,3)", "(3,4)", "(0,3)", "(3,0)"], ans: 1, topic: "Coordinate Geometry" },
      { q: "If a line has slope 2 and passes through (1,3), its equation is:", opts: ["y = 2x + 1", "y = 2x − 3", "y = 2x + 5", "y = x + 2"], ans: 0, topic: "Coordinate Geometry" },
      { q: "The median of 3, 7, 5, 9, 1 is:", opts: ["3", "5", "7", "9"], ans: 1, topic: "Statistics" },
      { q: "Sum of interior angles of a pentagon:", opts: ["360°", "540°", "720°", "900°"], ans: 1, topic: "Geometry" },
      { q: "If x : y = 3 : 4 and y : z = 2 : 3, then x : z =", opts: ["1:2", "3:8", "1:3", "2:5"], ans: 0, topic: "Ratio & Proportion" },
    ],
  },

  {
    id: "icse-10-sci-2022",
    board: "ICSE", subject: "Science", grade: "Class 10", year: 2022, difficulty: "Easy",
    questions: [
      { q: "Which of the following is an acid-base indicator?", opts: ["Starch", "Litmus", "Benedict's solution", "Iodine solution"], ans: 1, topic: "Chemistry" },
      { q: "The formula for kinetic energy is:", opts: ["mgh", "½mv²", "mv", "F × d"], ans: 1, topic: "Physics" },
      { q: "Which part of the eye controls the amount of light entering?", opts: ["Cornea", "Lens", "Iris", "Retina"], ans: 2, topic: "Biology" },
      { q: "Carbon forms 4 covalent bonds because it has valency:", opts: ["2", "4", "6", "8"], ans: 1, topic: "Chemistry" },
      { q: "The human heart has how many chambers?", opts: ["2", "3", "4", "6"], ans: 2, topic: "Biology" },
      { q: "Which wave does not require a medium for propagation?", opts: ["Sound wave", "Water wave", "Electromagnetic wave", "Seismic wave"], ans: 2, topic: "Physics" },
      { q: "Ammonia is produced by the Haber process using N₂ and:", opts: ["O₂", "H₂", "Cl₂", "He"], ans: 1, topic: "Chemistry" },
      { q: "Which of the following is a vestigial organ in humans?", opts: ["Liver", "Appendix", "Kidney", "Pancreas"], ans: 1, topic: "Biology" },
      { q: "The image formed by a plane mirror is:", opts: ["Real and erect", "Virtual and erect", "Real and inverted", "Virtual and inverted"], ans: 1, topic: "Physics" },
      { q: "Electrolysis of water produces oxygen at the:", opts: ["Cathode", "Anode", "Both electrodes", "Neither"], ans: 1, topic: "Chemistry" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // JEE
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "jee-phy-2024",
    board: "JEE", subject: "Physics", grade: "JEE Mains", year: 2024, difficulty: "Hard",
    questions: [
      { q: "A block of mass 2 kg on a frictionless surface is pushed by force 10 N. Acceleration is:", opts: ["2 m/s²", "5 m/s²", "10 m/s²", "20 m/s²"], ans: 1, topic: "Mechanics" },
      { q: "The time period of a simple pendulum of length L is proportional to:", opts: ["L", "√L", "L²", "1/√L"], ans: 1, topic: "Oscillations" },
      { q: "In adiabatic compression, temperature of gas:", opts: ["Increases", "Decreases", "Remains constant", "Depends on gas"], ans: 0, topic: "Thermodynamics" },
      { q: "The critical angle for total internal reflection in glass (n=1.5) is:", opts: ["45°", "48.6°", "60°", "30°"], ans: 1, topic: "Optics" },
      { q: "Energy stored in an inductor of inductance L carrying current I is:", opts: ["LI", "L²I/2", "LI²/2", "LI²"], ans: 2, topic: "Electromagnetic Induction" },
      { q: "The binding energy per nucleon is maximum for:", opts: ["Hydrogen", "Iron (Fe)", "Uranium", "Carbon"], ans: 1, topic: "Atoms & Nuclei" },
      { q: "A body executing SHM has maximum velocity at:", opts: ["Extreme positions", "Mean position", "Between mean and extreme", "At amplitude"], ans: 1, topic: "Oscillations" },
      { q: "Wavelength of X-rays is of the order of:", opts: ["10⁻² m", "10⁻⁷ m", "10⁻¹⁰ m", "10⁻¹⁵ m"], ans: 2, topic: "Electromagnetic Waves" },
      { q: "The terminal velocity of a sphere in a viscous fluid is proportional to:", opts: ["r", "r²", "r³", "1/r"], ans: 1, topic: "Fluid Mechanics" },
      { q: "A photon of frequency ν has momentum:", opts: ["hν", "hν/c", "hνc", "h/ν"], ans: 1, topic: "Modern Physics" },
    ],
  },

  {
    id: "jee-phy-2023",
    board: "JEE", subject: "Physics", grade: "JEE Mains", year: 2023, difficulty: "Hard",
    questions: [
      { q: "A ball is thrown vertically upward with velocity 20 m/s. Max height (g=10):", opts: ["10 m", "20 m", "30 m", "40 m"], ans: 1, topic: "Kinematics" },
      { q: "In Young's double slit experiment, when slit separation is doubled, fringe width:", opts: ["Doubles", "Halves", "Remains same", "Quadruples"], ans: 1, topic: "Optics" },
      { q: "A capacitor of 4 μF charged to 500 V. Energy stored:", opts: ["0.5 J", "0.25 J", "1 J", "2 J"], ans: 0, topic: "Electrostatics" },
      { q: "Which has zero magnetic moment?", opts: ["Fe³⁺", "Cu²⁺", "Zn²⁺", "Cr³⁺"], ans: 2, topic: "Magnetism" },
      { q: "Ratio of de Broglie wavelengths of proton vs α-particle (same potential):", opts: ["√2 : 1", "2√2 : 1", "1 : 2√2", "1 : 2"], ans: 1, topic: "Modern Physics" },
      { q: "Efficiency of Carnot engine with source at 500 K and sink at 300 K:", opts: ["20%", "30%", "40%", "60%"], ans: 2, topic: "Thermodynamics" },
      { q: "For a convex mirror, the image is always:", opts: ["Real and inverted", "Virtual and erect", "Real and erect", "Virtual and inverted"], ans: 1, topic: "Optics" },
      { q: "The force between two parallel wires carrying currents in same direction:", opts: ["Repulsive", "Attractive", "Zero", "Depends on current magnitude"], ans: 1, topic: "Magnetism" },
      { q: "Bernoulli's equation is based on conservation of:", opts: ["Mass", "Momentum", "Energy", "Angular momentum"], ans: 2, topic: "Fluid Mechanics" },
      { q: "The work function of a metal is the minimum energy required to:", opts: ["Ionise the atom", "Eject an electron from the surface", "Break a chemical bond", "Excite an electron"], ans: 1, topic: "Modern Physics" },
    ],
  },

  {
    id: "jee-chem-2024",
    board: "JEE", subject: "Chemistry", grade: "JEE Mains", year: 2024, difficulty: "Hard",
    questions: [
      { q: "Hybridisation of carbon in graphite is:", opts: ["sp", "sp²", "sp³", "sp³d"], ans: 1, topic: "Chemical Bonding" },
      { q: "Which has the highest lattice energy?", opts: ["NaF", "NaCl", "NaBr", "NaI"], ans: 0, topic: "Ionic Equilibrium" },
      { q: "IUPAC name of CH₂=CH−CH₂−OH is:", opts: ["Prop-2-en-1-ol", "Prop-1-en-3-ol", "Allyl alcohol", "Propenol"], ans: 0, topic: "Organic Chemistry" },
      { q: "Reagent to distinguish aldehyde from ketone:", opts: ["Tollens' reagent", "Lucas reagent", "Hinsberg reagent", "Baeyer's reagent"], ans: 0, topic: "Organic Chemistry" },
      { q: "Rate constant of first-order reaction has units:", opts: ["L mol⁻¹ s⁻¹", "mol L⁻¹ s⁻¹", "s⁻¹", "mol⁻¹ L s⁻¹"], ans: 2, topic: "Chemical Kinetics" },
      { q: "The shape of SF₆ is:", opts: ["Octahedral", "Tetrahedral", "Square planar", "Trigonal bipyramidal"], ans: 0, topic: "Chemical Bonding" },
      { q: "Which of the following is aromatic?", opts: ["Cyclobutadiene", "Benzene", "Cyclooctatetraene", "Cyclohexane"], ans: 1, topic: "Organic Chemistry" },
      { q: "The EAN of [Co(NH₃)₆]³⁺ is:", opts: ["27", "33", "36", "45"], ans: 2, topic: "Coordination Compounds" },
      { q: "Which of the following is strongest acid?", opts: ["CH₃COOH", "CCl₃COOH", "CBr₃COOH", "CF₃COOH"], ans: 3, topic: "Organic Chemistry" },
      { q: "Standard electrode potential of hydrogen is:", opts: ["+1 V", "0 V", "−1 V", "+2 V"], ans: 1, topic: "Electrochemistry" },
    ],
  },

  {
    id: "jee-chem-2023",
    board: "JEE", subject: "Chemistry", grade: "JEE Mains", year: 2023, difficulty: "Hard",
    questions: [
      { q: "Which of the following has maximum number of unpaired electrons?", opts: ["Fe²⁺", "Fe³⁺", "Co³⁺", "Ni²⁺"], ans: 1, topic: "d-block Elements" },
      { q: "The Cannizzaro reaction involves:", opts: ["Reduction only", "Oxidation only", "Disproportionation", "Elimination"], ans: 2, topic: "Organic Chemistry" },
      { q: "Aniline on reaction with HNO₂ at 0–5°C gives:", opts: ["Phenol", "Diazonium salt", "Nitrobenzene", "Azobenzene"], ans: 1, topic: "Amines" },
      { q: "In SN2 reaction, the mechanism involves:", opts: ["Carbocation intermediate", "Carbanion intermediate", "Backside attack with inversion", "Frontside attack with retention"], ans: 2, topic: "Organic Chemistry" },
      { q: "Which of the following is NOT a colligative property?", opts: ["Osmotic pressure", "Vapour pressure lowering", "Optical activity", "Boiling point elevation"], ans: 2, topic: "Solutions" },
      { q: "The bond angle in H₂O is approximately:", opts: ["109.5°", "104.5°", "120°", "90°"], ans: 1, topic: "Chemical Bonding" },
      { q: "Alkyl isocyanide is formed by:", opts: ["Victor Meyer test", "Carbylamine reaction", "Hoffmann bromamide", "Reimer-Tiemann"], ans: 1, topic: "Amines" },
      { q: "The element with configuration [Ar]3d¹⁰4s² is:", opts: ["Cu", "Zn", "Ga", "Ge"], ans: 1, topic: "d-block Elements" },
      { q: "Which statement about noble gases is INCORRECT?", opts: ["They have completely filled orbitals", "They form stable compounds with fluorine", "They have very high ionisation energies", "They are coloured gases"], ans: 3, topic: "p-Block Elements" },
      { q: "Ziegler-Natta catalyst is used for:", opts: ["Polymerisation of alkenes", "Friedel-Crafts reaction", "Diazotisation", "Hydrolysis of esters"], ans: 0, topic: "Polymers" },
    ],
  },

  {
    id: "jee-math-2024",
    board: "JEE", subject: "Mathematics", grade: "JEE Mains", year: 2024, difficulty: "Hard",
    questions: [
      { q: "If z = (1 + i)/(1 − i), then z⁴ equals:", opts: ["1", "−1", "i", "−i"], ans: 0, topic: "Complex Numbers" },
      { q: "The value of lim(x→0) (sin x − x)/x³ is:", opts: ["−1/6", "1/6", "−1/3", "0"], ans: 0, topic: "Limits" },
      { q: "General solution of dy/dx = y/x is:", opts: ["y = cx²", "y = cx", "y = c/x", "xy = c"], ans: 1, topic: "Differential Equations" },
      { q: "Number of ways to arrange 4 boys and 3 girls so no two girls sit together:", opts: ["144", "1440", "720", "288"], ans: 1, topic: "Permutations & Combinations" },
      { q: "If f(x) = x² and g(x) = 2x, then (f∘g)(3) equals:", opts: ["18", "36", "12", "9"], ans: 1, topic: "Functions" },
      { q: "The sum of series 1 + 1/2 + 1/4 + … ∞ is:", opts: ["2", "3", "4", "∞"], ans: 0, topic: "Series & Sequences" },
      { q: "Area of triangle with vertices (0,0), (4,0), (0,3) is:", opts: ["6 sq units", "12 sq units", "7 sq units", "3.5 sq units"], ans: 0, topic: "Coordinate Geometry" },
      { q: "The eccentricity of ellipse x²/16 + y²/9 = 1 is:", opts: ["√7/4", "7/4", "√7/16", "3/4"], ans: 0, topic: "Conics" },
      { q: "∫ x·eˣ dx equals:", opts: ["xeˣ + eˣ + C", "xeˣ − eˣ + C", "eˣ(x−1) + C", "Both B and C"], ans: 3, topic: "Integrals" },
      { q: "Rank of matrix [[1,2,3],[4,5,6],[7,8,9]] is:", opts: ["3", "2", "1", "0"], ans: 1, topic: "Matrices" },
    ],
  },

  {
    id: "jee-math-2023",
    board: "JEE", subject: "Mathematics", grade: "JEE Mains", year: 2023, difficulty: "Hard",
    questions: [
      { q: "The number of real solutions of eˣ = x² is:", opts: ["0", "1", "2", "3"], ans: 0, topic: "Functions" },
      { q: "If the line y = mx is tangent to y = x² − x + 1, then m equals:", opts: ["1 or −1", "−1", "1", "0 or 2"], ans: 2, topic: "Applications of Derivatives" },
      { q: "The coefficient of x⁵ in (1 + x)¹⁰ is:", opts: ["120", "252", "210", "45"], ans: 1, topic: "Binomial Theorem" },
      { q: "Principle value of cos⁻¹(−1/2) is:", opts: ["π/3", "2π/3", "π/4", "3π/4"], ans: 1, topic: "Inverse Trigonometry" },
      { q: "If P(A) = 0.5, P(B) = 0.3, P(A∩B) = 0.15 (independent), P(A∪B) =", opts: ["0.65", "0.8", "0.3", "0.5"], ans: 0, topic: "Probability" },
      { q: "The distance of point (2, 3, 4) from plane x + y + z = 9 is:", opts: ["0", "1/√3", "3/√3", "√3"], ans: 0, topic: "3D Geometry" },
      { q: "If |a| = 3, |b| = 4 and a·b = 6, angle between them is:", opts: ["30°", "60°", "90°", "45°"], ans: 1, topic: "Vector Algebra" },
      { q: "The general term of GP with first term 2 and ratio 3 is:", opts: ["2·3ⁿ", "2·3^{n-1}", "3·2ⁿ", "6ⁿ"], ans: 1, topic: "Series & Sequences" },
      { q: "Value of sin 75° is:", opts: ["(√6+√2)/4", "(√6−√2)/4", "√3/2", "1/√2"], ans: 0, topic: "Trigonometry" },
      { q: "∫₀² |x − 1| dx equals:", opts: ["0", "1", "2", "3"], ans: 1, topic: "Integrals" },
    ],
  },

  {
    id: "jee-adv-phy-2023",
    board: "JEE", subject: "Physics (Advanced)", grade: "JEE Advanced", year: 2023, difficulty: "Hard",
    questions: [
      { q: "A rod of mass M and length L rotates about one end. Moment of inertia:", opts: ["ML²/2", "ML²/3", "ML²/4", "ML²/12"], ans: 1, topic: "Rotational Motion" },
      { q: "Two charges +q and −q separated by distance d. The electric field at midpoint:", opts: ["Zero", "kq/d²", "4kq/d²", "2kq/d²"], ans: 2, topic: "Electrostatics" },
      { q: "A particle in SHM: if displacement x = A sin(ωt), velocity at x = A/2 is:", opts: ["Aω/2", "Aω√3/2", "Aω√2", "Aω"], ans: 1, topic: "Oscillations" },
      { q: "Escape velocity from Earth's surface is related to g and R by:", opts: ["√(gR)", "√(2gR)", "2√(gR)", "√(gR/2)"], ans: 1, topic: "Gravitation" },
      { q: "In a LC circuit, if L = 2 H and C = 8 μF, resonant frequency ω₀ is:", opts: ["250 rad/s", "2500 rad/s", "125 rad/s", "500 rad/s"], ans: 0, topic: "Alternating Current" },
      { q: "The Stefan-Boltzmann law states that radiated power is proportional to:", opts: ["T", "T²", "T³", "T⁴"], ans: 3, topic: "Thermal Physics" },
      { q: "For a gas obeying PV = nRT, during isothermal expansion, internal energy:", opts: ["Increases", "Decreases", "Remains constant", "Becomes zero"], ans: 2, topic: "Thermodynamics" },
      { q: "A wire of resistance R is stretched to triple its length. New resistance:", opts: ["3R", "R/3", "9R", "R/9"], ans: 2, topic: "Current Electricity" },
      { q: "Brewster's angle is defined when reflected and refracted rays are:", opts: ["Parallel", "At 45°", "Perpendicular", "At 60°"], ans: 2, topic: "Optics" },
      { q: "Half-life of radioactive element is 2 years. In 8 years, fraction remaining:", opts: ["1/2", "1/4", "1/8", "1/16"], ans: 3, topic: "Atoms & Nuclei" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEET
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "neet-bio-2024",
    board: "NEET", subject: "Biology", grade: "NEET UG", year: 2024, difficulty: "Hard",
    questions: [
      { q: "Which feature is NOT found in viruses?", opts: ["Obligate intracellular parasite", "Contains both DNA and RNA simultaneously", "Can be crystallised", "Lacks cellular organisation"], ans: 1, topic: "Biological Classification" },
      { q: "The functional unit of the kidney is:", opts: ["Glomerulus", "Nephron", "Loop of Henle", "Collecting duct"], ans: 1, topic: "Excretory Products" },
      { q: "Enzyme that converts glucose-6-phosphate to fructose-6-phosphate:", opts: ["Hexokinase", "Phosphoglucose isomerase", "Phosphofructokinase", "Aldolase"], ans: 1, topic: "Respiration" },
      { q: "Crossing Over occurs during:", opts: ["Leptotene", "Zygotene", "Pachytene", "Diplotene"], ans: 2, topic: "Cell Division" },
      { q: "ABO blood groups are an example of:", opts: ["Codominance", "Incomplete dominance", "Pleiotropy", "Epistasis"], ans: 0, topic: "Genetics" },
      { q: "The energy currency of the cell is:", opts: ["NADH", "FADH₂", "ATP", "GTP"], ans: 2, topic: "Respiration" },
      { q: "In which phase of mitosis do chromosomes align at the equatorial plate?", opts: ["Prophase", "Anaphase", "Metaphase", "Telophase"], ans: 2, topic: "Cell Division" },
      { q: "Which of the following is a C4 plant?", opts: ["Wheat", "Rice", "Sugarcane", "Pea"], ans: 2, topic: "Photosynthesis" },
      { q: "The process of conversion of glucose to pyruvate is called:", opts: ["Krebs cycle", "Glycolysis", "Gluconeogenesis", "Electron transport"], ans: 1, topic: "Respiration" },
      { q: "Which blood group is the universal donor?", opts: ["A", "B", "AB", "O"], ans: 3, topic: "Body Fluids & Circulation" },
    ],
  },

  {
    id: "neet-bio-2023",
    board: "NEET", subject: "Biology", grade: "NEET UG", year: 2023, difficulty: "Medium",
    questions: [
      { q: "The site of photosynthesis in plants is:", opts: ["Mitochondria", "Chloroplast", "Ribosome", "Golgi body"], ans: 1, topic: "Photosynthesis" },
      { q: "DNA polymerase synthesises new DNA in which direction?", opts: ["3′ to 5′", "5′ to 3′", "Both directions simultaneously", "Random direction"], ans: 1, topic: "Molecular Biology" },
      { q: "Which hormone produces the fight or flight response?", opts: ["Insulin", "Thyroxine", "Adrenaline", "Cortisol"], ans: 2, topic: "Chemical Coordination" },
      { q: "The Calvin cycle takes place in the:", opts: ["Thylakoid membrane", "Stroma of chloroplast", "Cytosol", "Mitochondrial matrix"], ans: 1, topic: "Photosynthesis" },
      { q: "Haemoglobin contains which metal ion?", opts: ["Zinc", "Copper", "Iron", "Magnesium"], ans: 2, topic: "Body Fluids & Circulation" },
      { q: "The phloem transports:", opts: ["Water only", "Minerals only", "Organic solutes from leaves", "CO₂"], ans: 2, topic: "Plant Physiology" },
      { q: "Synapsis occurs between:", opts: ["Two neurons", "Homologous chromosomes", "Sister chromatids", "Non-homologous chromosomes"], ans: 1, topic: "Cell Division" },
      { q: "Which of the following is a non-renewable natural resource?", opts: ["Sunlight", "Water", "Coal", "Wind"], ans: 2, topic: "Ecology" },
      { q: "Hardy-Weinberg principle states that allele frequencies remain constant when:", opts: ["Mutation occurs", "Natural selection acts", "Population is large with random mating", "Migration occurs"], ans: 2, topic: "Evolution" },
      { q: "The vector for malaria is:", opts: ["Female Anopheles mosquito", "Male Anopheles mosquito", "Aedes mosquito", "Culex mosquito"], ans: 0, topic: "Human Health" },
    ],
  },

  {
    id: "neet-bio-2022",
    board: "NEET", subject: "Biology", grade: "NEET UG", year: 2022, difficulty: "Medium",
    questions: [
      { q: "Which of the following is present in RNA but not DNA?", opts: ["Adenine", "Guanine", "Uracil", "Cytosine"], ans: 2, topic: "Molecular Biology" },
      { q: "The term 'Darwinism' refers to:", opts: ["Inheritance of acquired characters", "Natural selection as mechanism of evolution", "Genetic drift", "Mutation theory"], ans: 1, topic: "Evolution" },
      { q: "Auxins are produced in:", opts: ["Root tip", "Shoot apex", "Leaf margins", "Seeds"], ans: 1, topic: "Plant Growth" },
      { q: "Number of ATP produced per molecule of glucose in aerobic respiration:", opts: ["2", "8", "36–38", "12"], ans: 2, topic: "Respiration" },
      { q: "The part of the brain that controls balance and coordination is:", opts: ["Cerebrum", "Medulla oblongata", "Cerebellum", "Hypothalamus"], ans: 2, topic: "Neural Control" },
      { q: "Which of the following is correctly matched?", opts: ["Klinefelter: 45, XO", "Turner: 47, XXY", "Down: Trisomy 21", "Haemophilia: Autosomal recessive"], ans: 2, topic: "Genetics" },
      { q: "The chlorophyll a and b absorb maximally in which colour?", opts: ["Green", "Yellow", "Blue-violet and red", "White"], ans: 2, topic: "Photosynthesis" },
      { q: "Interferon is produced in response to:", opts: ["Bacterial infection", "Viral infection", "Fungal infection", "Parasitic infection"], ans: 1, topic: "Human Health" },
      { q: "Mycorrhiza is an association between:", opts: ["Algae and bacteria", "Fungi and plant roots", "Cyanobacteria and plant", "Fungi and algae"], ans: 1, topic: "Ecology" },
      { q: "The nitrogenous base NOT found in DNA is:", opts: ["Adenine", "Thymine", "Uracil", "Guanine"], ans: 2, topic: "Molecular Biology" },
    ],
  },

  {
    id: "neet-chem-2024",
    board: "NEET", subject: "Chemistry", grade: "NEET UG", year: 2024, difficulty: "Hard",
    questions: [
      { q: "Hybridisation of nitrogen in NH₃ is:", opts: ["sp", "sp²", "sp³", "sp³d"], ans: 2, topic: "Chemical Bonding" },
      { q: "Which is the strongest acid?", opts: ["HF", "HCl", "HBr", "HI"], ans: 3, topic: "p-Block Elements" },
      { q: "Reaction of primary amines with HNO₂ at 0–5°C gives:", opts: ["Diazonium salt", "Amide", "Secondary amine", "Nitrile"], ans: 0, topic: "Amines" },
      { q: "Osmotic pressure of 0.1 M glucose at 300 K (R = 0.082 L·atm/mol·K):", opts: ["0.82 atm", "2.46 atm", "1.23 atm", "0.41 atm"], ans: 1, topic: "Solutions" },
      { q: "Which of the following is a lyophilic colloid?", opts: ["Gold sol", "Sulphur sol", "Starch sol", "Fe(OH)₃ sol"], ans: 2, topic: "Surface Chemistry" },
      { q: "Radiocarbon dating uses which isotope?", opts: ["C-12", "C-13", "C-14", "C-11"], ans: 2, topic: "Nuclear Chemistry" },
      { q: "Which test is used to detect glucose in urine?", opts: ["Fehling's test", "Benedict's test", "Biuret test", "Ninhydrin test"], ans: 1, topic: "Biomolecules" },
      { q: "Wurtz reaction involves the use of:", opts: ["Sodium metal", "Potassium metal", "Zinc-copper couple", "NaOH solution"], ans: 0, topic: "Organic Chemistry" },
      { q: "The IUPAC name of acetone is:", opts: ["Propanone", "Ethanol", "Propanol", "Ethanone"], ans: 0, topic: "Organic Chemistry" },
      { q: "Law of conservation of matter in chemistry is related to:", opts: ["Lavoisier's law", "Dalton's law", "Gay Lussac's law", "Avogadro's law"], ans: 0, topic: "Basic Chemistry" },
    ],
  },

  {
    id: "neet-chem-2023",
    board: "NEET", subject: "Chemistry", grade: "NEET UG", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Which of the following is an electrophile?", opts: ["NH₃", "H₂O", "BF₃", "CH₃⁻"], ans: 2, topic: "Organic Chemistry" },
      { q: "The IUPAC name of glycerol is:", opts: ["Propanol", "Propane-1,2,3-triol", "Propanediol", "Glycol"], ans: 1, topic: "Organic Chemistry" },
      { q: "Which of the following has highest boiling point?", opts: ["CH₄", "C₂H₆", "C₃H₈", "C₄H₁₀"], ans: 3, topic: "Organic Chemistry" },
      { q: "In the periodic table, atomic radius generally decreases:", opts: ["Down a group", "Across a period left to right", "Right to left across a period", "Up the group"], ans: 1, topic: "Periodic Table" },
      { q: "Enthalpy change ΔH = ΔU + ΔnRT. For a reaction where Δn = 0:", opts: ["ΔH > ΔU", "ΔH < ΔU", "ΔH = ΔU", "ΔH = 0"], ans: 2, topic: "Thermodynamics" },
      { q: "The oxidation state of Cr in K₂Cr₂O₇ is:", opts: ["+3", "+4", "+6", "+7"], ans: 2, topic: "d-Block Elements" },
      { q: "Which of the following is NOT a method of expressing concentration?", opts: ["Molarity", "Molality", "Normality", "Density"], ans: 3, topic: "Solutions" },
      { q: "Buffer solution resists change in:", opts: ["Temperature", "Pressure", "pH", "Volume"], ans: 2, topic: "Ionic Equilibrium" },
      { q: "Fehling's solution is reduced by:", opts: ["Glucose", "Sucrose", "Starch", "Fructose only"], ans: 0, topic: "Biomolecules" },
      { q: "The number of π bonds in benzene is:", opts: ["3", "6", "9", "12"], ans: 0, topic: "Organic Chemistry" },
    ],
  },

  {
    id: "neet-phy-2024",
    board: "NEET", subject: "Physics", grade: "NEET UG", year: 2024, difficulty: "Hard",
    questions: [
      { q: "A body of mass 5 kg moves at 10 m/s. Kinetic energy:", opts: ["500 J", "250 J", "100 J", "50 J"], ans: 1, topic: "Work, Energy & Power" },
      { q: "SI unit of electric potential:", opts: ["Ampere", "Joule", "Volt", "Coulomb"], ans: 2, topic: "Electrostatics" },
      { q: "Which has maximum penetrating power?", opts: ["Alpha rays", "Beta rays", "Gamma rays", "X-rays"], ans: 2, topic: "Atoms & Nuclei" },
      { q: "Refractive index of glass is 1.5. Speed of light in glass:", opts: ["3 × 10⁸ m/s", "2 × 10⁸ m/s", "1.5 × 10⁸ m/s", "4.5 × 10⁸ m/s"], ans: 1, topic: "Ray Optics" },
      { q: "Depletion layer in p-n junction is formed by:", opts: ["Drift of majority carriers", "Diffusion of majority carriers", "Drift of minority carriers", "Tunnelling effect"], ans: 1, topic: "Semiconductor Electronics" },
      { q: "Newton's second law states F = ma. If mass doubles and acceleration halves, F:", opts: ["Remains the same", "Doubles", "Halves", "Quadruples"], ans: 0, topic: "Laws of Motion" },
      { q: "The velocity of sound in air at 0°C is approximately:", opts: ["232 m/s", "332 m/s", "432 m/s", "532 m/s"], ans: 1, topic: "Waves" },
      { q: "Ohm's law states V = IR. If R is doubled and V stays same, current:", opts: ["Doubles", "Halves", "Stays same", "Quadruples"], ans: 1, topic: "Current Electricity" },
      { q: "The principle behind a nuclear reactor is:", opts: ["Fusion", "Fission", "Radioactive decay", "Annihilation"], ans: 1, topic: "Atoms & Nuclei" },
      { q: "Which type of mirror is used as a rear-view mirror?", opts: ["Concave", "Convex", "Plane", "Parabolic"], ans: 1, topic: "Ray Optics" },
    ],
  },

  {
    id: "neet-phy-2023",
    board: "NEET", subject: "Physics", grade: "NEET UG", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Orbital velocity of satellite at height h above Earth:", opts: ["√(gR)", "√(gR²/(R+h))", "√(g(R+h))", "gR/(R+h)"], ans: 1, topic: "Gravitation" },
      { q: "Time constant of RC circuit:", opts: ["R/C", "C/R", "RC", "1/RC"], ans: 2, topic: "Current Electricity" },
      { q: "Two resistors R₁ and R₂ in parallel, equivalent resistance:", opts: ["R₁+R₂", "R₁R₂/(R₁+R₂)", "R₁R₂", "(R₁+R₂)/2"], ans: 1, topic: "Current Electricity" },
      { q: "Work function of metal is 3 eV. Photoelectric emission occurs for λ less than:", opts: ["413 nm", "620 nm", "310 nm", "826 nm"], ans: 0, topic: "Dual Nature of Matter" },
      { q: "Lenz's law is consequence of conservation of:", opts: ["Charge", "Mass", "Energy", "Momentum"], ans: 2, topic: "Electromagnetic Induction" },
      { q: "In projectile motion, the horizontal component of velocity is:", opts: ["Always increasing", "Always decreasing", "Constant throughout", "Zero at maximum height"], ans: 2, topic: "Kinematics" },
      { q: "Pressure exerted by gas is due to:", opts: ["Weight of gas molecules", "Intermolecular forces", "Collisions of molecules with walls", "Gravitational pull"], ans: 2, topic: "Kinetic Theory" },
      { q: "The dimension of power is:", opts: ["ML²T⁻²", "ML²T⁻³", "MLT⁻²", "ML²T⁻¹"], ans: 1, topic: "Dimensions" },
      { q: "When a body is in uniform circular motion:", opts: ["Speed and direction both change", "Speed is constant, direction changes", "Both are constant", "Speed changes, direction is constant"], ans: 1, topic: "Circular Motion" },
      { q: "Magnetic field due to a current-carrying straight wire at distance r varies as:", opts: ["r", "1/r", "r²", "1/r²"], ans: 1, topic: "Magnetism" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SAT
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "sat-math-2024",
    board: "SAT", subject: "Mathematics", grade: "SAT", year: 2024, difficulty: "Medium",
    questions: [
      { q: "If 3x + 7 = 22, what is the value of 6x + 14?", opts: ["30", "44", "15", "5"], ans: 1, topic: "Algebra" },
      { q: "A circle has radius 5. What is its area?", opts: ["10π", "25π", "50π", "5π"], ans: 1, topic: "Geometry" },
      { q: "Mean of 5 numbers is 12. Adding a 6th number 18, new mean:", opts: ["13", "14", "15", "12.5"], ans: 0, topic: "Statistics" },
      { q: "f(x) = 2x² − 3x + 1. f(2) equals:", opts: ["3", "7", "1", "5"], ans: 0, topic: "Functions" },
      { q: "Right triangle, hypotenuse 13, one leg 5. Other leg:", opts: ["8", "10", "12", "√144"], ans: 2, topic: "Geometry" },
      { q: "If y = 2x − 4, when y = 0, x =", opts: ["2", "4", "−2", "−4"], ans: 0, topic: "Algebra" },
      { q: "The slope of line through (1, 2) and (3, 8) is:", opts: ["2", "3", "4", "6"], ans: 1, topic: "Coordinate Geometry" },
      { q: "15 is what percent of 60?", opts: ["4%", "15%", "25%", "40%"], ans: 2, topic: "Percentages" },
      { q: "If 2ˣ = 32, then x =", opts: ["4", "5", "6", "8"], ans: 1, topic: "Exponents" },
      { q: "A bag has 3 red, 4 blue, 5 green balls. P(not red) =", opts: ["1/4", "3/4", "1/3", "2/3"], ans: 1, topic: "Probability" },
    ],
  },

  {
    id: "sat-math-2023",
    board: "SAT", subject: "Mathematics", grade: "SAT", year: 2023, difficulty: "Medium",
    questions: [
      { q: "If x² − 9 = 0, then x =", opts: ["±3", "±9", "3 only", "9 only"], ans: 0, topic: "Algebra" },
      { q: "A rectangle has length 3x and width 2x. Perimeter in terms of x:", opts: ["5x", "6x²", "10x", "12x²"], ans: 2, topic: "Geometry" },
      { q: "Which expression is equivalent to (x + 3)²?", opts: ["x² + 9", "x² + 6x + 9", "x² + 3x + 9", "x² + 6x + 6"], ans: 1, topic: "Algebra" },
      { q: "Speed = distance/time. If d = 120 km and t = 2 h, speed:", opts: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], ans: 1, topic: "Rates & Ratios" },
      { q: "The median of {2, 4, 6, 8, 10} is:", opts: ["4", "5", "6", "7"], ans: 2, topic: "Statistics" },
      { q: "How many integers between 1 and 100 are divisible by both 3 and 4?", opts: ["6", "7", "8", "9"], ans: 2, topic: "Number Theory" },
      { q: "In a circle, a 90° central angle subtends an arc. Arc length / circumference =", opts: ["1/4", "1/2", "1/3", "π/4"], ans: 0, topic: "Geometry" },
      { q: "If f(x) = 3x − 2 and f(a) = 7, then a =", opts: ["2", "3", "4", "5"], ans: 1, topic: "Functions" },
      { q: "Standard form of 0.00045 is:", opts: ["4.5 × 10⁻³", "4.5 × 10⁻⁴", "45 × 10⁻⁵", "0.45 × 10⁻³"], ans: 1, topic: "Exponents" },
      { q: "A store reduces a $80 item by 25%. Sale price:", opts: ["$55", "$60", "$65", "$70"], ans: 1, topic: "Percentages" },
    ],
  },

  {
    id: "sat-rw-2023",
    board: "SAT", subject: "Reading & Writing", grade: "SAT", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Which word best replaces 'ubiquitous' in 'Smartphones have become ubiquitous in modern life'?", opts: ["Rare", "Widespread", "Expensive", "Outdated"], ans: 1, topic: "Vocabulary in Context" },
      { q: "A passage argues renewable energy will replace fossil fuels by 2050. Which claim most weakens this?", opts: ["Solar costs fell 90% since 2010", "Battery storage technology is still immature", "Wind capacity doubled in a decade", "EVs outsell petrol cars in Norway"], ans: 1, topic: "Command of Evidence" },
      { q: "The author's primary purpose when writing about coral reef decline is most likely to:", opts: ["Entertain with underwater anecdotes", "Argue tourism should be banned", "Inform readers about environmental threats", "Critique government marine policy"], ans: 2, topic: "Central Idea" },
      { q: "Which punctuation correctly joins two independent clauses?", opts: ["I studied hard, I passed.", "I studied hard; I passed.", "I studied hard — I passed.", "I studied hard: I passed."], ans: 1, topic: "Grammar" },
      { q: "The transition word that best shows contrast is:", opts: ["Furthermore", "Therefore", "However", "Similarly"], ans: 2, topic: "Transitions" },
      { q: "'The CEO's remarks were ____ , leaving shareholders confused about the company's direction.' Best word:", opts: ["lucid", "ambiguous", "decisive", "redundant"], ans: 1, topic: "Vocabulary in Context" },
      { q: "Which sentence contains a dangling modifier?", opts: ["Running quickly, she caught the bus.", "Having finished dinner, the dishes were washed.", "The tired student fell asleep at his desk.", "She finished her homework before dinner."], ans: 1, topic: "Grammar" },
      { q: "A researcher quotes a 2019 study, but a 2023 meta-analysis contradicts it. What should they do?", opts: ["Ignore the newer study", "Acknowledge the newer study and revise the claim", "Remove all citations", "Use only the older study"], ans: 1, topic: "Command of Evidence" },
      { q: "Which of these is an example of a rhetorical question?", opts: ["Where is the library?", "Isn't it obvious that honesty is the best policy?", "What time does the train arrive?", "How many students are enrolled?"], ans: 1, topic: "Rhetoric" },
      { q: "The tone of a passage using words like 'catastrophic', 'devastating', and 'alarming' is best described as:", opts: ["Optimistic", "Neutral", "Urgent and alarming", "Sarcastic"], ans: 2, topic: "Tone & Style" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // IB
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "ib-math-hl-2023",
    board: "IB", subject: "Mathematics HL", grade: "IB Diploma", year: 2023, difficulty: "Hard",
    questions: [
      { q: "The sum of infinite geometric series 1 + 1/3 + 1/9 + … is:", opts: ["3/2", "2", "3", "4/3"], ans: 0, topic: "Series & Sequences" },
      { q: "If f(x) = ln(x² + 1), then f′(x) equals:", opts: ["1/(x²+1)", "2x/(x²+1)", "2x·ln(x²+1)", "x/(x²+1)"], ans: 1, topic: "Calculus" },
      { q: "(1 + i)⁸ equals:", opts: ["16", "−16", "16i", "−16i"], ans: 0, topic: "Complex Numbers" },
      { q: "P(A∪B) = 0.7, P(A) = 0.4, P(B) = 0.5. P(A∩B) equals:", opts: ["0.2", "0.3", "0.1", "0.4"], ans: 0, topic: "Probability" },
      { q: "Matrix [[2,1],[1,3]] eigenvalues are:", opts: ["1 and 4", "2 and 3", "0 and 5", "−1 and 6"], ans: 0, topic: "Matrices" },
      { q: "The derivative of sin²(x) is:", opts: ["2 sin x", "2 sin x cos x", "cos²(x)", "sin(2x)"], ans: 1, topic: "Calculus" },
      { q: "∫₀^1 x·e^x dx equals:", opts: ["e − 1", "1", "e", "2e − 1"], ans: 0, topic: "Integration" },
      { q: "If z = 3 + 4i, |z| equals:", opts: ["5", "7", "25", "√7"], ans: 0, topic: "Complex Numbers" },
      { q: "The number of ways to select 3 items from 8 (order matters) is:", opts: ["56", "336", "512", "24"], ans: 1, topic: "Combinatorics" },
      { q: "For y = arctan(x), dy/dx at x = 1 equals:", opts: ["1", "1/2", "π/4", "√2/2"], ans: 1, topic: "Calculus" },
    ],
  },

  {
    id: "ib-physics-2024",
    board: "IB", subject: "Physics", grade: "IB Diploma", year: 2024, difficulty: "Hard",
    questions: [
      { q: "Projectile launched at 30° with speed u. Time of flight:", opts: ["u sin30°/g", "2u sin30°/g", "u² sin60°/g", "u cos30°/g"], ans: 1, topic: "Mechanics" },
      { q: "First law of thermodynamics ΔU = Q − W. Gas does positive work and absorbs heat, ΔU is:", opts: ["Always positive", "Positive or negative depending on values", "Always negative", "Zero"], ans: 1, topic: "Thermodynamics" },
      { q: "Half-life of substance is 5 years. After 20 years, fraction remaining:", opts: ["1/4", "1/8", "1/16", "1/32"], ans: 2, topic: "Atomic & Nuclear Physics" },
      { q: "E-field amplitude of EM wave in vacuum is 300 V/m. Intensity approximately:", opts: ["120 W/m²", "240 W/m²", "60 W/m²", "480 W/m²"], ans: 0, topic: "Waves" },
      { q: "Which quantity is invariant in all inertial frames (special relativity)?", opts: ["Time interval", "Length", "Speed of light", "Kinetic energy"], ans: 2, topic: "Relativity" },
      { q: "A proton moves with velocity v perpendicular to magnetic field B. The radius of circular path:", opts: ["mv/qB", "qB/mv", "qvB/m", "m/qvB"], ans: 0, topic: "Electromagnetism" },
      { q: "In SHM, the restoring force is proportional to:", opts: ["Velocity", "Acceleration", "Displacement from equilibrium", "Amplitude"], ans: 2, topic: "Oscillations" },
      { q: "The Doppler effect predicts that when a sound source approaches, observed frequency:", opts: ["Decreases", "Stays the same", "Increases", "Depends on temperature"], ans: 2, topic: "Waves" },
      { q: "Gravitational potential energy is:", opts: ["Always positive", "Always negative", "Zero at surface", "Depends on reference point"], ans: 1, topic: "Gravitation" },
      { q: "In a transformer, if voltage is stepped up, the current is:", opts: ["Also stepped up", "Stepped down", "Unchanged", "Reversed"], ans: 1, topic: "Electromagnetism" },
    ],
  },

  {
    id: "ib-chem-hl-2023",
    board: "IB", subject: "Chemistry HL", grade: "IB Diploma", year: 2023, difficulty: "Hard",
    questions: [
      { q: "The enthalpy change for breaking bonds is always:", opts: ["Negative (exothermic)", "Positive (endothermic)", "Zero", "Equal to bond energy formed"], ans: 1, topic: "Energetics" },
      { q: "According to Le Chatelier's principle, increasing pressure in N₂ + 3H₂ ⇌ 2NH₃ shifts equilibrium:", opts: ["Left", "Right", "No change", "Depends on temperature"], ans: 1, topic: "Equilibrium" },
      { q: "The rate-determining step in a reaction mechanism is the:", opts: ["Fastest step", "Slowest step", "Last step", "First step always"], ans: 1, topic: "Kinetics" },
      { q: "Which of the following is an SN1 reaction characteristic?", opts: ["Backside attack", "First-order kinetics", "Inversion of configuration only", "No carbocation intermediate"], ans: 1, topic: "Organic Chemistry" },
      { q: "Electronegativity increases:", opts: ["Down a group and left to right in a period", "Up a group and right to left in a period", "Up a group and left to right in a period", "Down a group and right to left in a period"], ans: 2, topic: "Periodic Table" },
      { q: "Buffer capacity is greatest when:", opts: ["pH = 1", "pH = pKa", "pH = 14", "pH = 7"], ans: 1, topic: "Acids & Bases" },
      { q: "Nuclear magnetic resonance (NMR) spectroscopy measures:", opts: ["Mass of ions", "Absorption of radiofrequency by nuclei in magnetic field", "Infrared absorption", "UV-Visible absorption"], ans: 1, topic: "Spectroscopy" },
      { q: "What is the oxidation state of Mn in KMnO₄?", opts: ["+5", "+6", "+7", "+4"], ans: 2, topic: "Redox Chemistry" },
      { q: "Which type of isomerism is shown by [Co(NH₃)₄Cl₂]Cl and [Co(NH₃)₄ClBr]Cl?", opts: ["Geometric", "Optical", "Ionisation", "Linkage"], ans: 2, topic: "Coordination Chemistry" },
      { q: "The Haber process for ammonia synthesis uses catalyst:", opts: ["Platinum", "Iron with K₂O and Al₂O₃ promoters", "Vanadium pentoxide", "Nickel"], ans: 1, topic: "Industrial Chemistry" },
    ],
  },
];
