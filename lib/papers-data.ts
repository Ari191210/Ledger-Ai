export type Question = {
  q: string;
  opts: [string, string, string, string];
  ans: number;
  topic: string;
};

export type Paper = {
  id: string;
  board: "CBSE" | "ICSE" | "JEE" | "SAT" | "IB" | "NEET" | "NCERT";
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

  // ─────────────────────────────────────────────────────────────────────────────
  // NCERT — Class 8
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "ncert-8-science",
    board: "NCERT", subject: "Science", grade: "Class 8", year: 2024, difficulty: "Easy",
    questions: [
      { q: "Microorganisms used in making bread are:", opts: ["Bacteria", "Yeast", "Algae", "Virus"], ans: 1, topic: "Microorganisms" },
      { q: "Coal is classified as a:", opts: ["Renewable resource", "Non-renewable resource", "Inexhaustible resource", "Biotic resource"], ans: 1, topic: "Coal & Petroleum" },
      { q: "Rusting of iron requires:", opts: ["Water only", "Oxygen only", "Both water and oxygen", "Carbon dioxide only"], ans: 2, topic: "Combustion & Flame" },
      { q: "Force of friction acts:", opts: ["In direction of motion", "Opposite to direction of motion", "Perpendicular to motion", "At 45° to motion"], ans: 1, topic: "Friction" },
      { q: "The cell is the structural and functional unit of:", opts: ["Organs", "Tissues", "All living organisms", "Atoms"], ans: 2, topic: "Cell Structure" },
      { q: "Sound travels fastest in:", opts: ["Air", "Water", "Vacuum", "Steel"], ans: 3, topic: "Sound" },
      { q: "Lightning is caused by:", opts: ["Sound waves", "Electrical discharge between clouds", "Magnetic storms", "UV radiation"], ans: 1, topic: "Some Natural Phenomena" },
      { q: "Which of these is NOT a natural fibre?", opts: ["Cotton", "Wool", "Nylon", "Silk"], ans: 2, topic: "Synthetic Fibres" },
      { q: "The process by which plants prepare their own food is:", opts: ["Respiration", "Photosynthesis", "Fermentation", "Transpiration"], ans: 1, topic: "Crop Production" },
      { q: "Stars produce their own light while planets:", opts: ["Also produce light", "Reflect light from the Sun", "Absorb all light", "Emit infrared only"], ans: 1, topic: "Stars & Solar System" },
    ],
  },

  {
    id: "ncert-8-maths",
    board: "NCERT", subject: "Mathematics", grade: "Class 8", year: 2024, difficulty: "Easy",
    questions: [
      { q: "The additive inverse of −5/7 is:", opts: ["5/7", "−7/5", "7/5", "−5/7"], ans: 0, topic: "Rational Numbers" },
      { q: "√225 equals:", opts: ["12", "13", "14", "15"], ans: 3, topic: "Squares & Square Roots" },
      { q: "The cube of −3 is:", opts: ["−9", "27", "−27", "9"], ans: 2, topic: "Cubes & Cube Roots" },
      { q: "Simple Interest on ₹1000 at 5% per annum for 2 years:", opts: ["₹50", "₹100", "₹150", "₹200"], ans: 1, topic: "Comparing Quantities" },
      { q: "Which is a linear equation in one variable?", opts: ["x² + 2 = 0", "2x + 3 = 7", "x + y = 5", "x/y = 2"], ans: 1, topic: "Linear Equations" },
      { q: "Factorisation of x² − 25:", opts: ["(x−5)²", "(x+5)(x−5)", "(x+5)²", "x(x−25)"], ans: 1, topic: "Factorisation" },
      { q: "Area of a rhombus with diagonals 8 cm and 6 cm:", opts: ["24 cm²", "48 cm²", "14 cm²", "28 cm²"], ans: 0, topic: "Mensuration" },
      { q: "If x varies directly as y, x = 5 when y = 25. Find y when x = 9:", opts: ["40", "45", "50", "35"], ans: 1, topic: "Direct & Inverse Proportion" },
      { q: "Expansion of (a + b)²:", opts: ["a² + b²", "a² + ab + b²", "a² + 2ab + b²", "2a + 2b"], ans: 2, topic: "Algebraic Expressions" },
      { q: "Value of 2⁻³:", opts: ["−8", "1/8", "8", "−1/8"], ans: 1, topic: "Exponents & Powers" },
    ],
  },

  {
    id: "ncert-8-sst",
    board: "NCERT", subject: "Social Science", grade: "Class 8", year: 2024, difficulty: "Easy",
    questions: [
      { q: "The Permanent Settlement of 1793 was introduced by:", opts: ["Lord Dalhousie", "Lord Cornwallis", "Thomas Munro", "Lord Clive"], ans: 1, topic: "Land Revenue Systems" },
      { q: "Who led the revolt of 1857 in Jhansi?", opts: ["Nana Sahib", "Tantia Tope", "Rani Lakshmibai", "Bahadur Shah Zafar"], ans: 2, topic: "Revolt of 1857" },
      { q: "The Indian National Congress was founded in:", opts: ["1881", "1883", "1885", "1887"], ans: 2, topic: "Nationalist Movement" },
      { q: "The practice of Sati was banned in:", opts: ["1819", "1829", "1835", "1847"], ans: 1, topic: "Social Reforms" },
      { q: "The Constitution of India was adopted on:", opts: ["15 Aug 1947", "26 Jan 1950", "26 Nov 1949", "15 Aug 1950"], ans: 2, topic: "Indian Constitution" },
      { q: "The Himalayas are an example of:", opts: ["Block mountains", "Volcanic mountains", "Fold mountains", "Residual mountains"], ans: 2, topic: "Resources & Development" },
      { q: "Which type of soil is most suitable for cotton cultivation?", opts: ["Alluvial", "Red", "Black (Regur)", "Laterite"], ans: 2, topic: "Agriculture" },
      { q: "Parliament of India consists of:", opts: ["Lok Sabha only", "Rajya Sabha only", "Lok Sabha and Rajya Sabha", "Lok Sabha, Rajya Sabha and President"], ans: 3, topic: "Parliament" },
      { q: "Who introduced the Ryotwari system?", opts: ["Lord Dalhousie", "Thomas Munro", "Lord Cornwallis", "Charles Metcalfe"], ans: 1, topic: "Land Revenue Systems" },
      { q: "The Right to Education Act guarantees free education up to age:", opts: ["10", "12", "14", "18"], ans: 2, topic: "Fundamental Rights" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NCERT — Class 9
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "ncert-9-science",
    board: "NCERT", subject: "Science", grade: "Class 9", year: 2024, difficulty: "Easy",
    questions: [
      { q: "Atoms of the same element with different mass numbers are called:", opts: ["Isobars", "Isotopes", "Ions", "Isomers"], ans: 1, topic: "Atoms & Molecules" },
      { q: "The process of conversion of solid directly to gas (without liquid stage):", opts: ["Evaporation", "Condensation", "Sublimation", "Melting"], ans: 2, topic: "Matter in Our Surroundings" },
      { q: "The 'powerhouse of the cell' is:", opts: ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"], ans: 2, topic: "Fundamental Unit of Life" },
      { q: "The tissue that provides mechanical support and rigidity to plants:", opts: ["Parenchyma", "Collenchyma", "Sclerenchyma", "Meristematic tissue"], ans: 2, topic: "Tissues" },
      { q: "Newton's First Law of Motion is also called the law of:", opts: ["Acceleration", "Gravitation", "Inertia", "Momentum"], ans: 2, topic: "Force & Laws of Motion" },
      { q: "Work done is maximum when force and displacement are:", opts: ["Perpendicular (90°)", "At 45°", "Opposite (180°)", "In the same direction (0°)"], ans: 3, topic: "Work & Energy" },
      { q: "The human ear can detect frequencies in the range:", opts: ["2 Hz to 2,000 Hz", "20 Hz to 20,000 Hz", "200 Hz to 2,000 Hz", "2,000 Hz to 20,000 Hz"], ans: 1, topic: "Sound" },
      { q: "Malaria is caused by:", opts: ["Bacteria", "Virus", "Protozoan (Plasmodium)", "Fungi"], ans: 2, topic: "Why Do We Fall Ill" },
      { q: "The acceleration due to gravity at Earth's surface is approximately:", opts: ["8.9 m/s²", "9.8 m/s²", "10.8 m/s²", "11.2 m/s²"], ans: 1, topic: "Gravitation" },
      { q: "Ozone layer is present in the:", opts: ["Troposphere", "Mesosphere", "Stratosphere", "Thermosphere"], ans: 2, topic: "Natural Resources" },
    ],
  },

  {
    id: "ncert-9-maths",
    board: "NCERT", subject: "Mathematics", grade: "Class 9", year: 2024, difficulty: "Medium",
    questions: [
      { q: "Which of the following is irrational?", opts: ["√4", "√9", "√2", "√16"], ans: 2, topic: "Number Systems" },
      { q: "Zero of the polynomial p(x) = 2x − 4:", opts: ["2", "−2", "4", "−4"], ans: 0, topic: "Polynomials" },
      { q: "A point on the y-axis has coordinates of the form:", opts: ["(x, 0)", "(0, y)", "(x, x)", "(y, y)"], ans: 1, topic: "Coordinate Geometry" },
      { q: "If two angles of a triangle are 60° and 70°, the third angle is:", opts: ["40°", "50°", "60°", "70°"], ans: 1, topic: "Lines & Angles" },
      { q: "Area of an equilateral triangle with side 4 cm:", opts: ["4√3 cm²", "8√3 cm²", "16√3 cm²", "2√3 cm²"], ans: 0, topic: "Triangles" },
      { q: "Two supplementary angles are in ratio 2:3. The larger angle is:", opts: ["72°", "90°", "108°", "120°"], ans: 2, topic: "Lines & Angles" },
      { q: "Volume of a cone with radius 3 cm and height 7 cm (π ≈ 22/7):", opts: ["66 cm³", "132 cm³", "198 cm³", "44 cm³"], ans: 0, topic: "Surface Areas & Volumes" },
      { q: "The median of a triangle divides it into:", opts: ["Two triangles of equal area", "Two triangles of unequal area", "Three equal parts", "Four equal triangles"], ans: 0, topic: "Triangles" },
      { q: "Sample space when rolling a single die:", opts: ["{1,2,3,4,5}", "{1,2,3,4,5,6}", "{0,1,2,3,4,5,6}", "{2,4,6}"], ans: 1, topic: "Probability" },
      { q: "The ordinate of all points on the x-axis is:", opts: ["1", "−1", "0", "Any real value"], ans: 2, topic: "Coordinate Geometry" },
    ],
  },

  {
    id: "ncert-9-sst",
    board: "NCERT", subject: "Social Science", grade: "Class 9", year: 2024, difficulty: "Easy",
    questions: [
      { q: "The French Revolution began in:", opts: ["1787", "1789", "1791", "1793"], ans: 1, topic: "The French Revolution" },
      { q: "Serfdom was abolished in Russia in:", opts: ["1856", "1861", "1871", "1881"], ans: 1, topic: "Socialism in Europe" },
      { q: "The Nazi Party came to power in Germany in:", opts: ["1929", "1931", "1933", "1939"], ans: 2, topic: "Nazism & Hitler" },
      { q: "India's highest peak located within Indian territory is:", opts: ["Mt. Everest", "K2", "Kangchenjunga", "Nanda Devi"], ans: 2, topic: "Physical Features of India" },
      { q: "The Ganga-Brahmaputra delta region is known as:", opts: ["Rann of Kutch", "Sundarbans", "Coromandel Coast", "Konkan Coast"], ans: 1, topic: "Drainage" },
      { q: "Which is NOT a feature of a democratic government?", opts: ["Free and fair elections", "Rule of law", "Military control over civilians", "Fundamental rights"], ans: 2, topic: "What is Democracy?" },
      { q: "MNREGA guarantees rural employment for at least:", opts: ["50 days", "100 days", "150 days", "200 days"], ans: 1, topic: "Food Security" },
      { q: "The poverty line in India is based primarily on:", opts: ["Income alone", "Caloric intake and minimum expenditure", "Landholding size", "Employment status"], ans: 1, topic: "Poverty as a Challenge" },
      { q: "Which drainage pattern resembles tree branches?", opts: ["Radial", "Centripetal", "Dendritic", "Trellis"], ans: 2, topic: "Drainage" },
      { q: "The Lok Sabha is also called:", opts: ["House of States", "Upper House", "House of the People", "Council of States"], ans: 2, topic: "Electoral Politics" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NCERT — Class 10
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "ncert-10-sst",
    board: "NCERT", subject: "Social Science", grade: "Class 10", year: 2024, difficulty: "Medium",
    questions: [
      { q: "The First World War began in:", opts: ["1912", "1913", "1914", "1915"], ans: 2, topic: "Nationalism in Europe" },
      { q: "Satyagraha as a political technique was first used by Gandhi in:", opts: ["India", "England", "South Africa", "France"], ans: 2, topic: "Nationalism in India" },
      { q: "The Salt March (Dandi March) was undertaken by Gandhi in:", opts: ["1929", "1930", "1931", "1932"], ans: 1, topic: "Nationalism in India" },
      { q: "The tertiary sector includes:", opts: ["Agriculture", "Mining", "Banking and services", "Manufacturing"], ans: 2, topic: "Sectors of Indian Economy" },
      { q: "Federal system means power is:", opts: ["All with centre", "All with states", "Divided between centre and states", "Held by judiciary"], ans: 2, topic: "Federalism" },
      { q: "Panchayati Raj (three-tier) was strengthened by the:", opts: ["72nd Amendment", "73rd Amendment", "74th Amendment", "75th Amendment"], ans: 1, topic: "Federalism" },
      { q: "Globalisation refers to:", opts: ["Only movement of goods between countries", "Integration of world economies", "Government control of trade", "Isolation of economies"], ans: 1, topic: "Globalisation" },
      { q: "HDI (Human Development Index) considers:", opts: ["Income alone", "Life expectancy alone", "Life expectancy, education and income", "Education and income only"], ans: 2, topic: "Development" },
      { q: "Majoritarianism as practised in Sri Lanka refers to:", opts: ["Equal rights for all", "Privileges for the Sinhalese majority", "Tamil dominance", "Federalism"], ans: 1, topic: "Power Sharing" },
      { q: "Money deposited in a bank generates income through:", opts: ["Dividends", "Interest", "Profit sharing", "Subsidy"], ans: 1, topic: "Money & Credit" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NCERT — Class 11
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "ncert-11-physics",
    board: "NCERT", subject: "Physics", grade: "Class 11", year: 2024, difficulty: "Medium",
    questions: [
      { q: "Dimensions of force (F = ma):", opts: ["[MLT⁻²]", "[ML²T⁻²]", "[MLT⁻¹]", "[ML²T⁻¹]"], ans: 0, topic: "Units & Measurements" },
      { q: "A body in uniform circular motion has:", opts: ["Constant velocity", "Zero acceleration", "Centripetal acceleration directed inward", "No net force acting"], ans: 2, topic: "Motion in a Plane" },
      { q: "Work done in lifting a 5 kg mass through 3 m (g = 10 m/s²):", opts: ["100 J", "150 J", "200 J", "300 J"], ans: 1, topic: "Work, Energy & Power" },
      { q: "Escape velocity from Earth depends on:", opts: ["Mass of the projectile", "Mass of Earth and its radius", "Angle of projection", "Atmospheric temperature"], ans: 1, topic: "Gravitation" },
      { q: "In SHM, at the mean position:", opts: ["Velocity is zero", "Acceleration is zero and velocity is maximum", "PE is maximum", "KE is zero"], ans: 1, topic: "Oscillations" },
      { q: "According to kinetic theory, temperature is a measure of:", opts: ["PE of molecules", "Average KE of molecules", "Speed of molecules", "Number of molecules"], ans: 1, topic: "Kinetic Theory" },
      { q: "In a perfectly elastic collision:", opts: ["KE is conserved, momentum is not", "Momentum is conserved, KE is not", "Both KE and momentum are conserved", "Neither is conserved"], ans: 2, topic: "Work, Energy & Power" },
      { q: "Modulus of elasticity has SI unit:", opts: ["N/m", "N·m", "N/m² (Pa)", "N·m²"], ans: 2, topic: "Mechanical Properties of Solids" },
      { q: "The angle of contact for water in a glass tube is:", opts: ["Greater than 90° (obtuse)", "Exactly 90°", "Less than 90° (acute)", "0° always"], ans: 2, topic: "Mechanical Properties of Fluids" },
      { q: "The speed of transverse waves on a string depends on:", opts: ["Frequency only", "Tension and linear mass density", "Amplitude only", "Temperature only"], ans: 1, topic: "Waves" },
    ],
  },

  {
    id: "ncert-11-chemistry",
    board: "NCERT", subject: "Chemistry", grade: "Class 11", year: 2024, difficulty: "Medium",
    questions: [
      { q: "Molar mass of H₂O:", opts: ["16 g/mol", "18 g/mol", "20 g/mol", "17 g/mol"], ans: 1, topic: "Some Basic Concepts" },
      { q: "Bohr's atomic model successfully explains:", opts: ["Zeeman effect", "Spectrum of hydrogen atom", "Spectrum of multi-electron atoms", "Fine structure of spectral lines"], ans: 1, topic: "Structure of Atom" },
      { q: "The quantum number that determines the orientation of an orbital:", opts: ["Principal (n)", "Azimuthal (l)", "Magnetic (mₗ)", "Spin (mₛ)"], ans: 2, topic: "Structure of Atom" },
      { q: "Which has the maximum number of molecules? (1 g each)", opts: ["H₂", "O₂", "N₂", "H₂O"], ans: 0, topic: "Some Basic Concepts" },
      { q: "Electronegativity of elements generally increases:", opts: ["Down a group", "Across a period from right to left", "Across a period from left to right", "Down a group and left to right"], ans: 2, topic: "Classification of Elements" },
      { q: "In an endothermic reaction at constant pressure, ΔH is:", opts: ["Negative", "Positive", "Zero", "Equal to ΔU"], ans: 1, topic: "Thermodynamics" },
      { q: "Equilibrium constant Kc depends on:", opts: ["Pressure only", "Concentration only", "Temperature only", "Catalyst added"], ans: 2, topic: "Equilibrium" },
      { q: "General formula for alkenes:", opts: ["CₙH₂ₙ₊₂", "CₙH₂ₙ", "CₙH₂ₙ₋₂", "CₙHₙ"], ans: 1, topic: "Hydrocarbons" },
      { q: "The standard state of bromine at 25°C and 1 atm is:", opts: ["Gas", "Liquid", "Solid", "Plasma"], ans: 1, topic: "Some Basic Concepts" },
      { q: "Freon (CFC) is used primarily as:", opts: ["Fuel", "Refrigerant and aerosol propellant", "Explosive", "Fertiliser"], ans: 1, topic: "Environmental Chemistry" },
    ],
  },

  {
    id: "ncert-11-maths",
    board: "NCERT", subject: "Mathematics", grade: "Class 11", year: 2024, difficulty: "Medium",
    questions: [
      { q: "A set that contains exactly one element is called:", opts: ["Empty set", "Singleton set", "Infinite set", "Universal set"], ans: 1, topic: "Sets" },
      { q: "sin(90° + θ) equals:", opts: ["sin θ", "−sin θ", "cos θ", "−cos θ"], ans: 2, topic: "Trigonometric Functions" },
      { q: "Modulus of the complex number (3 + 4i):", opts: ["3", "4", "5", "7"], ans: 2, topic: "Complex Numbers" },
      { q: "Number of terms in the expansion of (a + b)¹⁰:", opts: ["10", "11", "12", "9"], ans: 1, topic: "Binomial Theorem" },
      { q: "Sum of first n odd natural numbers:", opts: ["n²", "n(n+1)", "n(n+1)/2", "2n"], ans: 0, topic: "Sequences & Series" },
      { q: "Slope of line 3x + 4y + 8 = 0:", opts: ["3/4", "−3/4", "4/3", "−4/3"], ans: 1, topic: "Straight Lines" },
      { q: "Vertex of parabola y² = 12x:", opts: ["(3, 0)", "(−3, 0)", "(0, 0)", "(0, 3)"], ans: 2, topic: "Conic Sections" },
      { q: "lim(x→0) (eˣ − 1)/x:", opts: ["0", "∞", "1", "e"], ans: 2, topic: "Limits & Derivatives" },
      { q: "Standard deviation of {2, 4, 6, 8, 10}:", opts: ["2", "√8", "2√2", "4"], ans: 2, topic: "Statistics" },
      { q: "A coin is tossed 3 times. P(at least 2 heads):", opts: ["1/2", "3/8", "5/8", "1/8"], ans: 0, topic: "Probability" },
    ],
  },

  {
    id: "ncert-11-biology",
    board: "NCERT", subject: "Biology", grade: "Class 11", year: 2024, difficulty: "Medium",
    questions: [
      { q: "The cell theory was proposed by:", opts: ["Robert Hooke", "Schleiden and Schwann", "Virchow", "Watson & Crick"], ans: 1, topic: "Cell: The Unit of Life" },
      { q: "The fluid mosaic model of the cell membrane was proposed by:", opts: ["Watson & Crick", "Singer and Nicolson", "Schleiden & Schwann", "Flemming"], ans: 1, topic: "Cell: The Unit of Life" },
      { q: "Which structure is absent in plant cells?", opts: ["Cell wall", "Chloroplast", "Centriole", "Large vacuole"], ans: 2, topic: "Cell: The Unit of Life" },
      { q: "Ribosomes are the site of:", opts: ["DNA replication", "Transcription", "Protein synthesis (translation)", "Energy production"], ans: 2, topic: "Cell: The Unit of Life" },
      { q: "Kingdom Monera includes:", opts: ["Fungi", "Bacteria and Cyanobacteria", "Algae", "Protozoa"], ans: 1, topic: "Biological Classification" },
      { q: "In C₃ plants, CO₂ is first fixed into:", opts: ["Oxaloacetate", "Malate", "3-Phosphoglycerate (3-PGA)", "Sucrose"], ans: 2, topic: "Photosynthesis" },
      { q: "Long-distance transport of food (assimilates) in plants is called:", opts: ["Transpiration pull", "Root pressure", "Translocation", "Osmosis"], ans: 2, topic: "Transport in Plants" },
      { q: "Primary (apical) growth in plants occurs at:", opts: ["Lateral meristem", "Apical meristem", "Intercalary meristem only", "Cambium"], ans: 1, topic: "Plant Growth" },
      { q: "Adrenaline (epinephrine) is secreted by:", opts: ["Thyroid gland", "Adrenal medulla", "Pancreas", "Anterior pituitary"], ans: 1, topic: "Chemical Coordination" },
      { q: "The process of semi-conservative DNA replication was experimentally proved by:", opts: ["Watson & Crick", "Meselson & Stahl", "Hershey & Chase", "Griffith"], ans: 1, topic: "Cell Cycle & Division" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NCERT — Class 12
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "ncert-12-economics",
    board: "NCERT", subject: "Economics", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "When Marginal Utility (MU) = 0, Total Utility (TU) is at its:", opts: ["Minimum", "Maximum", "Zero", "Still increasing"], ans: 1, topic: "Consumer Equilibrium" },
      { q: "A good whose demand falls when consumer's income rises is called:", opts: ["Normal good", "Inferior good", "Giffen good", "Luxury good"], ans: 1, topic: "Consumer Behaviour" },
      { q: "In perfect competition, a firm is a:", opts: ["Price maker", "Price taker", "Quantity setter", "Monopolist"], ans: 1, topic: "Producer Behaviour" },
      { q: "The multiplier (k) equals:", opts: ["MPS", "1/MPS", "MPC", "1 − MPC"], ans: 1, topic: "Determination of Income" },
      { q: "Central bank of India is:", opts: ["SBI", "HDFC Bank", "RBI", "SEBI"], ans: 2, topic: "Money & Banking" },
      { q: "The current account of Balance of Payments records:", opts: ["Long-term capital flows only", "Exports and imports of goods and services", "FDI only", "Government external borrowings"], ans: 1, topic: "Balance of Payments" },
      { q: "Fiscal deficit = Total expenditure minus:", opts: ["Revenue receipts", "Tax revenue only", "Total receipts excluding borrowings", "Non-tax revenue"], ans: 2, topic: "Government Budget" },
      { q: "GDP at factor cost = GDP at market price minus:", opts: ["Depreciation", "Net indirect taxes", "NNP", "Foreign income"], ans: 1, topic: "National Income" },
      { q: "If MPS = 0.25, the value of the investment multiplier is:", opts: ["2", "3", "4", "5"], ans: 2, topic: "Determination of Income" },
      { q: "Demand-pull inflation is caused by:", opts: ["Rising costs of production", "Excess demand in the economy", "Supply shortages only", "Falling wages"], ans: 1, topic: "Inflation" },
    ],
  },

  {
    id: "ncert-12-business",
    board: "NCERT", subject: "Business Studies", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "'Unity of Command' principle states that:", opts: ["One subordinate, many supervisors", "One supervisor for all", "Each subordinate reports to only one superior", "All workers have equal authority"], ans: 2, topic: "Principles of Management" },
      { q: "Maslow's hierarchy of needs from base to apex:", opts: ["Safety→Physiological→Social→Esteem→Self-actualisation", "Physiological→Safety→Social→Esteem→Self-actualisation", "Social→Safety→Physiological→Esteem→Self-actualisation", "Esteem→Physiological→Safety→Social→Self-actualisation"], ans: 1, topic: "Directing" },
      { q: "Marketing mix consists of:", opts: ["3 Ps", "4 Ps (Product, Price, Place, Promotion)", "5 Ps", "6 Ps"], ans: 1, topic: "Marketing" },
      { q: "A debenture is:", opts: ["Ownership capital", "Borrowed (debt) capital", "Retained earnings", "Reserve fund"], ans: 1, topic: "Financial Management" },
      { q: "Controlling as a management function involves:", opts: ["Setting objectives only", "Recruiting staff", "Comparing actual performance with standards", "Motivating employees"], ans: 2, topic: "Controlling" },
      { q: "Consumer Protection Act 2019 provides for consumer courts at:", opts: ["National level only", "National and state levels", "District, state and national levels", "District level only"], ans: 2, topic: "Consumer Protection" },
      { q: "Directing includes:", opts: ["Planning and organising", "Leadership, motivation, communication, supervision", "Controlling and evaluating", "Staffing and planning"], ans: 1, topic: "Directing" },
      { q: "Working capital = Current assets minus:", opts: ["Fixed assets", "Current liabilities", "Long-term liabilities", "Share capital"], ans: 1, topic: "Financial Management" },
      { q: "The process of converting a public company into a private one is:", opts: ["Disinvestment", "Privatisation", "Nationalisation", "Corporatisation"], ans: 1, topic: "Business Environment" },
      { q: "Taylor's Scientific Management focuses on:", opts: ["Employee welfare", "Maximum output with minimum effort through scientific methods", "Democratic leadership", "Decentralisation"], ans: 1, topic: "Principles of Management" },
    ],
  },

  {
    id: "ncert-12-accountancy",
    board: "NCERT", subject: "Accountancy", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "The fundamental accounting equation is:", opts: ["Assets = Liabilities − Capital", "Assets = Liabilities + Capital", "Capital = Assets + Liabilities", "Liabilities = Assets + Capital"], ans: 1, topic: "Accounting Equation" },
      { q: "Double-entry system requires every transaction to be recorded with:", opts: ["Only a debit entry", "Only a credit entry", "Equal debit and credit entries", "Random entries"], ans: 2, topic: "Double Entry System" },
      { q: "Goodwill in partnership accounts is recognised when:", opts: ["A new partner joins", "A partner retires", "The firm is dissolved", "Any of the above"], ans: 3, topic: "Admission of Partner" },
      { q: "The primary purpose of a Trial Balance is to verify:", opts: ["Profitability of business", "Liquidity of business", "Arithmetic accuracy of ledger postings", "Solvency of business"], ans: 2, topic: "Trial Balance" },
      { q: "Depreciation is:", opts: ["A capital expenditure", "A cash expense paid annually", "A non-cash charge reducing asset value", "Revenue receipt"], ans: 2, topic: "Depreciation" },
      { q: "Revenue expenditure is shown in the:", opts: ["Balance Sheet (Asset side)", "Profit & Loss Account", "Balance Sheet (Liability side)", "Capital Account"], ans: 1, topic: "Financial Statements" },
      { q: "When goods are sold on credit, the account credited is:", opts: ["Cash account", "Sales account", "Debtor's account", "Creditor's account"], ans: 1, topic: "Journal Entries" },
      { q: "Subscriptions received by a Not-for-Profit Organisation are treated as:", opts: ["Capital receipt", "Revenue receipt (income)", "Liability", "Asset"], ans: 1, topic: "Not-for-Profit Organisations" },
      { q: "The financial statement that shows the position on a specific date:", opts: ["Income statement", "Cash flow statement", "Balance sheet", "Trading account"], ans: 2, topic: "Financial Statements" },
      { q: "If capital is ₹5,00,000 and interest on capital is 10% p.a., interest amount:", opts: ["₹5,000", "₹50,000", "₹5,00,000", "₹500"], ans: 1, topic: "Partnership Accounts" },
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

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE 12 — Economics & English
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-12-eco-2024",
    board: "CBSE", subject: "Economics", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "GDP at Factor Cost = GDP at Market Price –", opts: ["Subsidies", "Indirect taxes", "Net indirect taxes", "Depreciation"], ans: 2, topic: "National Income" },
      { q: "Which of the following is a stock concept?", opts: ["National income", "Savings", "Wealth", "Investment"], ans: 2, topic: "National Income" },
      { q: "The 'Banker's Bank' function is performed by:", opts: ["Commercial banks", "RBI", "NABARD", "SBI"], ans: 1, topic: "Money & Banking" },
      { q: "When government expenditure exceeds government revenue, it is called:", opts: ["Trade deficit", "Current account deficit", "Budget deficit", "Capital deficit"], ans: 2, topic: "Government Budget" },
      { q: "Value Added = Value of Output –", opts: ["Wages paid", "Intermediate consumption", "Depreciation", "Taxes"], ans: 1, topic: "National Income" },
      { q: "Which of the following is included in Money Supply (M1)?", opts: ["Fixed deposits", "Demand deposits", "Time deposits", "Recurring deposits"], ans: 1, topic: "Money & Banking" },
      { q: "Marginal Propensity to Consume (MPC) + Marginal Propensity to Save (MPS) =", opts: ["0", "0.5", "1", "2"], ans: 2, topic: "Income Determination" },
      { q: "Balance of Trade =", opts: ["Exports + Imports", "Exports − Imports", "Imports − Exports", "Exports × Imports"], ans: 1, topic: "Balance of Payments" },
      { q: "Investment multiplier k =", opts: ["1/MPS", "1/MPC", "MPC/MPS", "MPS/MPC"], ans: 0, topic: "Income Determination" },
      { q: "If Nominal GDP = ₹2000 cr and Price Index = 125, Real GDP =", opts: ["₹2500 cr", "₹1600 cr", "₹1000 cr", "₹2000 cr"], ans: 1, topic: "National Income" },
    ],
  },

  {
    id: "cbse-12-eco-2023",
    board: "CBSE", subject: "Economics", grade: "Class 12", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Which of the following is a flow concept?", opts: ["Money supply", "National debt", "National income", "Capital stock"], ans: 2, topic: "National Income" },
      { q: "Transfer payments are:", opts: ["Included in NNP at MP", "Excluded from national income", "Included in GDP at FC", "Part of capital receipts"], ans: 1, topic: "National Income" },
      { q: "Credit creation by commercial banks is limited by:", opts: ["Cash Reserve Ratio", "Repo rate only", "Bank rate only", "Government policy"], ans: 0, topic: "Money & Banking" },
      { q: "An increase in government spending with constant tax revenue causes:", opts: ["Surplus budget", "Balanced budget", "Deficit budget", "No change"], ans: 2, topic: "Government Budget" },
      { q: "Current Account of Balance of Payments includes:", opts: ["FDI flows", "Portfolio investment", "Trade in goods and services", "Loans from IMF"], ans: 2, topic: "Balance of Payments" },
      { q: "The concept of 'effective demand' was given by:", opts: ["Marshall", "Pigou", "Keynes", "Ricardo"], ans: 2, topic: "Income Determination" },
      { q: "Real GDP adjusts Nominal GDP for changes in:", opts: ["Population", "Price level", "Interest rates", "Exchange rates"], ans: 1, topic: "National Income" },
      { q: "Which is NOT a function of money?", opts: ["Medium of exchange", "Store of value", "Production of goods", "Standard of deferred payment"], ans: 2, topic: "Money & Banking" },
      { q: "Open market operations refer to buying/selling of:", opts: ["Foreign currency", "Government securities by RBI", "Shares on stock market", "Gold by government"], ans: 1, topic: "Money & Banking" },
      { q: "If MPC = 0.8, the value of multiplier is:", opts: ["2", "4", "5", "8"], ans: 2, topic: "Income Determination" },
    ],
  },

  {
    id: "cbse-12-eng-2024",
    board: "CBSE", subject: "English", grade: "Class 12", year: 2024, difficulty: "Easy",
    questions: [
      { q: "In 'The Last Lesson', M. Hamel wore his special Sunday clothes because:", opts: ["It was a holiday", "It was his last French lesson", "There was a school inspection", "It was his birthday"], ans: 1, topic: "Flamingo — Prose" },
      { q: "'Deep Water' is an autobiographical account written by:", opts: ["Mark Twain", "Ernest Hemingway", "William O. Douglas", "Jack London"], ans: 2, topic: "Flamingo — Prose" },
      { q: "In 'The Rattrap', the peddler compared the world to a rattrap because:", opts: ["It was a trap for animals", "The world lures people with riches then traps them", "People were like rats", "Life was circular with no escape"], ans: 1, topic: "Flamingo — Prose" },
      { q: "'Aunt Jennifer's Tigers' is written by:", opts: ["Adrienne Rich", "Kamala Das", "Sylvia Plath", "Maya Angelou"], ans: 0, topic: "Flamingo — Poetry" },
      { q: "Pablo Neruda in 'Keeping Quiet' urges the reader to count up to:", opts: ["5", "10", "12", "20"], ans: 2, topic: "Flamingo — Poetry" },
      { q: "In 'Going Places', Sophie's closest friend who listens to her fantasies is:", opts: ["Geoff", "Danny Casey", "Jansie", "Derek"], ans: 2, topic: "Flamingo — Prose" },
      { q: "'A Thing of Beauty' is an excerpt from the poem:", opts: ["Lamia", "Endymion", "The Eve of St. Agnes", "Ode to a Nightingale"], ans: 1, topic: "Flamingo — Poetry" },
      { q: "In 'Lost Spring', Saheb's full name means:", opts: ["Lord of the poor", "Lord of the Universe", "Master of the city", "King of springs"], ans: 1, topic: "Flamingo — Prose" },
      { q: "The story 'The Enemy' is set during:", opts: ["World War I", "The Korean War", "World War II", "The Vietnam War"], ans: 2, topic: "Vistas" },
      { q: "In 'On the Face of It', Mr. Lamb's garden has a tree full of:", opts: ["Apples", "Mangoes", "Crab apples", "Pears"], ans: 2, topic: "Vistas" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE 10 — English & SST
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-10-eng-2024",
    board: "CBSE", subject: "English", grade: "Class 10", year: 2024, difficulty: "Easy",
    questions: [
      { q: "In 'A Letter to God', Lencho compared the raindrops to:", opts: ["Silver coins", "New coins", "Pearls", "Diamonds"], ans: 1, topic: "First Flight — Prose" },
      { q: "'His First Flight' — the young seagull was afraid of:", opts: ["Water", "Other birds", "Flying", "Humans"], ans: 2, topic: "First Flight — Prose" },
      { q: "Wanda Petronski in 'The Hundred Dresses' claimed to own:", opts: ["50 dresses", "100 dresses", "200 dresses", "10 dresses"], ans: 1, topic: "First Flight — Prose" },
      { q: "Coorg is also known as the:", opts: ["God's Own Country", "Scotland of India", "Land of Spices", "Garden of India"], ans: 1, topic: "First Flight — Prose" },
      { q: "In 'Mijbil the Otter', Gavin Maxwell got his otter from:", opts: ["Iraq", "Iran", "Kuwait", "Egypt"], ans: 0, topic: "First Flight — Prose" },
      { q: "'The Trees' is written by:", opts: ["Robert Frost", "Adrienne Rich", "Walt Whitman", "William Blake"], ans: 1, topic: "First Flight — Poetry" },
      { q: "In 'Amanda!', Amanda dreams of being:", opts: ["A princess", "An orphan roaming freely", "A mermaid", "All of these"], ans: 3, topic: "First Flight — Poetry" },
      { q: "Valli's great desire was to ride the:", opts: ["Train", "Bus", "Boat", "Bicycle"], ans: 1, topic: "First Flight — Prose" },
      { q: "In 'The Hack Driver', the narrator was searching for:", opts: ["Oliver Lutkins", "Bill Magnuson", "Fritz", "Gustaff"], ans: 0, topic: "Footprints Without Feet" },
      { q: "'A Question of Trust' features a thief named:", opts: ["Horace Danby", "Griffin", "Lutkins", "Ausable"], ans: 0, topic: "Footprints Without Feet" },
    ],
  },

  {
    id: "cbse-10-sst-2024",
    board: "CBSE", subject: "Social Science", grade: "Class 10", year: 2024, difficulty: "Medium",
    questions: [
      { q: "The Rowlatt Act was passed in:", opts: ["1917", "1919", "1921", "1923"], ans: 1, topic: "Nationalism in India" },
      { q: "Satyagraha literally means:", opts: ["Non-cooperation", "Civil disobedience", "Soul force or truth force", "Passive resistance"], ans: 2, topic: "Nationalism in India" },
      { q: "The Non-Cooperation Movement was launched in:", opts: ["1919", "1920", "1921", "1922"], ans: 1, topic: "Nationalism in India" },
      { q: "Which sector is also called the service sector?", opts: ["Primary", "Secondary", "Tertiary", "Quaternary"], ans: 2, topic: "Sectors of Indian Economy" },
      { q: "Which of the following is NOT a feature of federalism?", opts: ["Two or more levels of government", "Single central authority over all", "Written constitution", "Division of powers"], ans: 1, topic: "Federalism" },
      { q: "India follows which type of party system?", opts: ["One-party", "Two-party", "Multi-party", "Bi-party"], ans: 2, topic: "Political Parties" },
      { q: "NREGA was launched to guarantee:", opts: ["Free food", "100 days of rural employment", "Housing for all", "Free education"], ans: 1, topic: "Development" },
      { q: "The Right to Information Act was passed in:", opts: ["2003", "2004", "2005", "2006"], ans: 2, topic: "Democracy & Diversity" },
      { q: "Globalisation leads to:", opts: ["Isolation of markets", "Integration of world economies", "Decrease in trade", "Rise of local monopolies"], ans: 1, topic: "Globalisation" },
      { q: "Which organisation resolves trade disputes between nations?", opts: ["IMF", "World Bank", "WTO", "UNCTAD"], ans: 2, topic: "Globalisation" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // JEE Advanced — Math & Chemistry
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "jee-adv-math-2023",
    board: "JEE", subject: "Mathematics", grade: "JEE Advanced", year: 2023, difficulty: "Hard",
    questions: [
      { q: "The number of real solutions of x² + 4|x| + 4 = 0 is:", opts: ["0", "1", "2", "4"], ans: 0, topic: "Algebra" },
      { q: "d/dx[sin²x] at x = π/2 equals:", opts: ["0", "1", "2", "−1"], ans: 0, topic: "Calculus" },
      { q: "∫₀^π sin²x dx =", opts: ["0", "π/4", "π/2", "π"], ans: 2, topic: "Calculus" },
      { q: "If det(A) = 5 for a 3×3 matrix A, then det(2A) =", opts: ["10", "20", "40", "5"], ans: 2, topic: "Matrices" },
      { q: "Sum of infinite GP 1 + 1/3 + 1/9 + … =", opts: ["2", "3/2", "1/2", "3"], ans: 1, topic: "Sequences & Series" },
      { q: "Letters of MATHEMATICS can be arranged in how many ways?", opts: ["11!/(2!2!2!)", "11!/4", "11!", "11!/8"], ans: 0, topic: "Permutations & Combinations" },
      { q: "General solution of sin θ = 1/2 is:", opts: ["nπ + (−1)ⁿ π/6", "nπ ± π/6", "2nπ ± π/6", "nπ/6"], ans: 0, topic: "Trigonometry" },
      { q: "Area enclosed between y = x² and y = x is:", opts: ["1/6", "1/3", "1/2", "1"], ans: 0, topic: "Calculus" },
      { q: "lim(x→0) (sin x)/x =", opts: ["0", "∞", "1", "−1"], ans: 2, topic: "Limits" },
      { q: "If |z| = 2 and arg(z) = π/3, the complex number z is:", opts: ["1 + i√3", "√3 + i", "2 + 2i", "1 + i"], ans: 0, topic: "Complex Numbers" },
    ],
  },

  {
    id: "jee-adv-chem-2023",
    board: "JEE", subject: "Chemistry", grade: "JEE Advanced", year: 2023, difficulty: "Hard",
    questions: [
      { q: "Hybridization of carbon in CO₂ is:", opts: ["sp", "sp²", "sp³", "sp³d"], ans: 0, topic: "Chemical Bonding" },
      { q: "IUPAC name of (CH₃)₃CCl is:", opts: ["1-Chlorobutane", "2-Chloro-2-methylpropane", "2-Methylpropyl chloride", "Butyl chloride"], ans: 1, topic: "Organic Chemistry" },
      { q: "Oxidation state of Cr in K₂Cr₂O₇ is:", opts: ["+3", "+4", "+6", "+7"], ans: 2, topic: "d-Block Elements" },
      { q: "pH of solution with [H⁺] = 10⁻⁷ M is:", opts: ["7", "−7", "0.1", "14"], ans: 0, topic: "Ionic Equilibrium" },
      { q: "Enthalpy of neutralisation of strong acid with strong base is approximately:", opts: ["−13.7 kJ/mol", "−57.1 kJ/mol", "+57.1 kJ/mol", "−100 kJ/mol"], ans: 1, topic: "Thermodynamics" },
      { q: "Number of σ bonds in ethyne (C₂H₂) is:", opts: ["2", "3", "4", "5"], ans: 1, topic: "Chemical Bonding" },
      { q: "Geometrical isomerism is shown by:", opts: ["CH₃CH₂Cl", "2-Butene", "Propane", "Ethanol"], ans: 1, topic: "Isomerism" },
      { q: "Which of the following has the highest first ionisation energy?", opts: ["Na", "Mg", "Al", "Si"], ans: 1, topic: "Periodic Table" },
      { q: "In SN2 reaction, the stereochemical outcome is:", opts: ["Retention of configuration", "Inversion of configuration", "Racemisation", "No change"], ans: 1, topic: "Organic Reaction Mechanisms" },
      { q: "The colligative property that depends on number of particles is:", opts: ["Colour", "Vapour pressure lowering", "Density", "Viscosity"], ans: 1, topic: "Solutions" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEET — Chemistry 2022
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "neet-chem-2022",
    board: "NEET", subject: "Chemistry", grade: "NEET UG", year: 2022, difficulty: "Medium",
    questions: [
      { q: "The shape of PCl₅ molecule is:", opts: ["Trigonal planar", "Trigonal bipyramidal", "Octahedral", "Tetrahedral"], ans: 1, topic: "Chemical Bonding" },
      { q: "Which of the following is an intensive property?", opts: ["Mass", "Volume", "Enthalpy", "Temperature"], ans: 3, topic: "Basic Concepts" },
      { q: "In a galvanic cell, oxidation occurs at:", opts: ["Cathode", "Anode", "Both electrodes", "Salt bridge"], ans: 1, topic: "Electrochemistry" },
      { q: "Freundlich adsorption isotherm fails at:", opts: ["Low pressure", "High pressure", "Moderate pressure", "All pressures"], ans: 1, topic: "Surface Chemistry" },
      { q: "Which transition metal has highest melting point?", opts: ["Fe", "Cu", "W (Tungsten)", "Cr"], ans: 2, topic: "d-Block Elements" },
      { q: "Phenol reacts with NaOH to give:", opts: ["Phenyl acetate", "Sodium phenoxide", "Benzene", "Aniline"], ans: 1, topic: "Organic Chemistry" },
      { q: "Degree of unsaturation of benzene (C₆H₆) is:", opts: ["2", "3", "4", "6"], ans: 2, topic: "Organic Chemistry" },
      { q: "Which amino acid is essential (not synthesised by human body)?", opts: ["Glycine", "Alanine", "Lysine", "Serine"], ans: 2, topic: "Biomolecules" },
      { q: "The polymer used in making non-stick cookware is:", opts: ["PVC", "Neoprene", "Teflon (PTFE)", "Bakelite"], ans: 2, topic: "Polymers" },
      { q: "Beer-Lambert law relates absorbance to:", opts: ["Temperature and pressure", "Concentration and path length", "Refractive index", "Wavelength only"], ans: 1, topic: "Analytical Chemistry" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE 10 & 12 SST — Additional Papers
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-10-sst-2023",
    board: "CBSE", subject: "Social Science", grade: "Class 10", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Zollverein was a customs union created among:", opts: ["French states", "Italian states", "German states", "Austro-Hungarian states"], ans: 2, topic: "Nationalism in Europe" },
      { q: "The Guomindang party was founded in:", opts: ["Japan", "Korea", "Vietnam", "China"], ans: 3, topic: "Industrialisation" },
      { q: "Corn Laws were repealed in Britain in:", opts: ["1813", "1846", "1860", "1900"], ans: 1, topic: "Global Economy" },
      { q: "The Bretton Woods Conference (1944) established:", opts: ["United Nations", "IMF and World Bank", "WTO", "NATO"], ans: 1, topic: "Global Economy" },
      { q: "Which of the following is a renewable resource?", opts: ["Coal", "Petroleum", "Solar energy", "Natural gas"], ans: 2, topic: "Resources & Development" },
      { q: "Laterite soil is found mainly in:", opts: ["Northern plains", "Peninsular plateau regions", "Desert areas", "Coastal deltas"], ans: 1, topic: "Resources & Development" },
      { q: "Bhakra Nangal dam is located on river:", opts: ["Ganga", "Yamuna", "Sutlej", "Beas"], ans: 2, topic: "Water Resources" },
      { q: "Power sharing in Belgium was agreed between:", opts: ["Hindus and Muslims", "Dutch and French-speaking communities", "Catholics and Protestants", "Rich and poor"], ans: 1, topic: "Power Sharing" },
      { q: "Consumer Protection Act was passed in India in:", opts: ["1984", "1986", "1991", "1995"], ans: 1, topic: "Consumer Rights" },
      { q: "SHG (Self Help Groups) primarily help:", opts: ["Large corporations", "Government agencies", "Rural poor especially women", "Urban industrialists"], ans: 2, topic: "Money & Credit" },
    ],
  },

  {
    id: "cbse-10-sst-2022",
    board: "CBSE", subject: "Social Science", grade: "Class 10", year: 2022, difficulty: "Medium",
    questions: [
      { q: "Frederic Sorrieu's vision in 1848 depicted:", opts: ["A united Europe under Napoleon", "A world of democratic and social republics", "A British Empire", "A communist state"], ans: 1, topic: "Nationalism in Europe" },
      { q: "The 1848 revolution in France led to:", opts: ["Monarchy being strengthened", "Declaration of a Republic", "French colonisation of Germany", "Formation of Zollverein"], ans: 1, topic: "Nationalism in Europe" },
      { q: "Jallianwala Bagh massacre occurred on:", opts: ["13 April 1919", "13 April 1920", "1 August 1920", "26 January 1930"], ans: 0, topic: "Nationalism in India" },
      { q: "Printing press was brought to India by:", opts: ["British traders", "Portuguese missionaries", "Dutch merchants", "French diplomats"], ans: 1, topic: "Print Culture" },
      { q: "Which industry is called the 'backbone' of modern industry?", opts: ["Textile", "Iron and Steel", "Information Technology", "Automobile"], ans: 1, topic: "Manufacturing Industries" },
      { q: "National Waterway No. 1 connects:", opts: ["Mumbai–Kochi", "Haldia–Allahabad", "Kolkata–Dhubri", "Chennai–Visakhapatnam"], ans: 1, topic: "Lifelines of Economy" },
      { q: "India's Parliament consists of:", opts: ["Lok Sabha only", "Rajya Sabha only", "Lok Sabha, Rajya Sabha and President", "Lok Sabha and Rajya Sabha only"], ans: 2, topic: "Outcomes of Democracy" },
      { q: "Poverty line in India is estimated based on:", opts: ["Income", "Calorie intake and consumption expenditure", "Land ownership", "Education level"], ans: 1, topic: "Development" },
      { q: "The Headquarters of WTO is in:", opts: ["New York", "Washington D.C.", "Geneva", "Brussels"], ans: 2, topic: "Globalisation" },
      { q: "NITI Aayog replaced which body in 2015?", opts: ["Finance Commission", "Planning Commission", "Election Commission", "CAG"], ans: 1, topic: "Development" },
    ],
  },

  {
    id: "cbse-12-history-2024",
    board: "CBSE", subject: "History", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "The Harappan script is:", opts: ["Deciphered and similar to Sanskrit", "Still undeciphered", "Similar to Brahmi script", "Identical to Mesopotamian script"], ans: 1, topic: "Harappan Civilisation" },
      { q: "The term 'mahajanapada' refers to:", opts: ["Large trading centres", "Sixteen powerful kingdoms and republics", "Buddhist monasteries", "Tax collection zones"], ans: 1, topic: "Political & Economic History" },
      { q: "Ashoka's Dhamma was primarily:", opts: ["A new religion", "A code of ethical and moral conduct", "A set of Buddhist rituals", "A military policy"], ans: 1, topic: "Mauryan Empire" },
      { q: "Al-Biruni came to India with:", opts: ["Timur", "Mahmud of Ghazni", "Muhammad Ghori", "Babur"], ans: 1, topic: "Medieval History" },
      { q: "The Ain-i-Akbari was compiled by:", opts: ["Akbar", "Birbal", "Abul Fazl", "Todar Mal"], ans: 2, topic: "Mughal Empire" },
      { q: "Indigo revolt (depicted in Neel Darpan) took place in:", opts: ["Punjab", "Bombay", "Bengal", "Madras"], ans: 2, topic: "Colonial Period" },
      { q: "The Cabinet Mission Plan (1946) proposed:", opts: ["Immediate partition", "A federal union retaining India's unity", "Direct rule by Britain", "Dominion status for Pakistan"], ans: 1, topic: "Independence & Partition" },
      { q: "The Constituent Assembly of India was chaired by:", opts: ["Nehru", "Patel", "Dr. Rajendra Prasad", "Ambedkar"], ans: 2, topic: "Constitution Making" },
      { q: "The Vijayanagara Empire's capital was:", opts: ["Mysore", "Hampi", "Madurai", "Thanjavur"], ans: 1, topic: "Medieval History" },
      { q: "Permanent Settlement of 1793 was introduced by:", opts: ["Warren Hastings", "Cornwallis", "Wellesley", "Dalhousie"], ans: 1, topic: "Colonial Period" },
    ],
  },

  {
    id: "cbse-12-polsci-2024",
    board: "CBSE", subject: "Political Science", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "India's foreign policy principle of Non-Alignment was established under:", opts: ["Indira Gandhi", "Jawaharlal Nehru", "Rajiv Gandhi", "Lal Bahadur Shastri"], ans: 1, topic: "Cold War Era" },
      { q: "The Directive Principles of State Policy in the Indian Constitution are:", opts: ["Justiciable", "Non-justiciable but fundamental to governance", "Applicable only to states", "Part of fundamental rights"], ans: 1, topic: "Constitution" },
      { q: "NAM (Non-Aligned Movement) was formed in:", opts: ["1955", "1961", "1965", "1971"], ans: 1, topic: "Cold War Era" },
      { q: "Which Article of Indian Constitution deals with Emergency?", opts: ["Article 352", "Article 370", "Article 356", "Both 352 and 356"], ans: 3, topic: "Constitution" },
      { q: "The Berlin Wall fell in:", opts: ["1985", "1987", "1989", "1991"], ans: 2, topic: "End of Cold War" },
      { q: "ASEAN was formed to promote:", opts: ["Military alliance", "Economic growth and regional stability", "Nuclear cooperation", "Cultural exchanges only"], ans: 1, topic: "Regional Organisations" },
      { q: "India conducted its first nuclear test (Pokhran-I) in:", opts: ["1968", "1972", "1974", "1979"], ans: 2, topic: "India's Security" },
      { q: "The 73rd Constitutional Amendment relates to:", opts: ["Reservation for OBCs", "Panchayati Raj institutions", "Freedom of press", "Right to Education"], ans: 1, topic: "Federalism" },
      { q: "Which party won India's first general elections in 1952?", opts: ["BJP", "Congress", "CPI", "Socialist Party"], ans: 1, topic: "Party System" },
      { q: "The concept of 'Third World' during Cold War referred to:", opts: ["Poor countries", "Non-aligned nations", "Communist bloc", "Western alliance"], ans: 1, topic: "Cold War Era" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE 12 — Psychology
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-12-psy-2024",
    board: "CBSE", subject: "Psychology", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "Spearman's theory of intelligence involves:", opts: ["7 Primary Mental Abilities", "g factor and s factors", "Multiple intelligences", "Triarchic theory"], ans: 1, topic: "Intelligence & Aptitude" },
      { q: "According to Maslow's hierarchy, the highest need is:", opts: ["Safety", "Love and belonging", "Esteem", "Self-actualisation"], ans: 3, topic: "Self & Personality" },
      { q: "The Big Five personality traits do NOT include:", opts: ["Openness", "Neuroticism", "Agreeableness", "Intelligence"], ans: 3, topic: "Self & Personality" },
      { q: "Positive stress caused by good events like marriage is called:", opts: ["Distress", "Eustress", "Hyperstress", "Burnout"], ans: 1, topic: "Stress & Coping" },
      { q: "DSM stands for:", opts: ["Differential Stress Measurement", "Diagnostic and Statistical Manual of Mental Disorders", "Dynamic Systems Model", "Disorders of Social Mentality"], ans: 1, topic: "Psychological Disorders" },
      { q: "Phobia is classified as a type of:", opts: ["Mood disorder", "Anxiety disorder", "Personality disorder", "Psychotic disorder"], ans: 1, topic: "Psychological Disorders" },
      { q: "Cognitive Behaviour Therapy (CBT) was primarily developed by:", opts: ["Sigmund Freud", "Carl Rogers", "Aaron Beck", "B.F. Skinner"], ans: 2, topic: "Therapeutic Approaches" },
      { q: "A stereotype is best described as:", opts: ["A prejudiced action", "A generalised belief about a social group", "A type of therapy", "An individual personality trait"], ans: 1, topic: "Attitude & Social Cognition" },
      { q: "Social loafing refers to:", opts: ["Working harder in groups", "Reduced individual effort when in a group", "Group conflict", "Leadership in groups"], ans: 1, topic: "Social Influence" },
      { q: "The Rorschach Inkblot Test is a type of:", opts: ["Intelligence test", "Aptitude test", "Projective personality test", "Achievement test"], ans: 2, topic: "Self & Personality" },
    ],
  },

  {
    id: "cbse-12-psy-2023",
    board: "CBSE", subject: "Psychology", grade: "Class 12", year: 2023, difficulty: "Medium",
    questions: [
      { q: "Howard Gardner's theory is known as:", opts: ["General intelligence theory", "Theory of Multiple Intelligences", "Triarchic theory", "Two-factor theory"], ans: 1, topic: "Intelligence & Aptitude" },
      { q: "The Id, Ego, and Superego are concepts from:", opts: ["Humanistic psychology", "Cognitive psychology", "Freudian psychoanalysis", "Behaviourism"], ans: 2, topic: "Self & Personality" },
      { q: "General Adaptation Syndrome (GAS) was proposed by:", opts: ["Lazarus", "Hans Selye", "Freud", "Maslow"], ans: 1, topic: "Stress & Coping" },
      { q: "Schizophrenia is primarily classified as a:", opts: ["Mood disorder", "Anxiety disorder", "Dissociative disorder", "Psychotic disorder"], ans: 3, topic: "Psychological Disorders" },
      { q: "The goal of psychoanalytic therapy is to:", opts: ["Reinforce positive behaviour", "Bring unconscious conflicts into consciousness", "Restructure cognitive patterns", "Use meditation and relaxation"], ans: 1, topic: "Therapeutic Approaches" },
      { q: "Conformity experiments were classically conducted by:", opts: ["Milgram", "Solomon Asch", "Philip Zimbardo", "Bandura"], ans: 1, topic: "Social Influence" },
      { q: "Milgram's obedience experiments demonstrated:", opts: ["People refuse authority easily", "Most people obey authority even against conscience", "Group conformity", "Bystander effect"], ans: 1, topic: "Social Influence" },
      { q: "Cognitive dissonance occurs when:", opts: ["Two people have opposing views", "A person's beliefs conflict with their behaviour", "Emotions overwhelm thinking", "Memory is impaired"], ans: 1, topic: "Attitude & Social Cognition" },
      { q: "Attribution theory explains how people:", opts: ["Form first impressions only", "Explain causes of their own and others' behaviour", "Conform to social norms", "Experience emotions"], ans: 1, topic: "Attitude & Social Cognition" },
      { q: "Which of the following is a defence mechanism?", opts: ["Cognitive restructuring", "Systematic desensitisation", "Repression", "Token economy"], ans: 2, topic: "Self & Personality" },
    ],
  },

  {
    id: "cbse-12-psy-2022",
    board: "CBSE", subject: "Psychology", grade: "Class 12", year: 2022, difficulty: "Medium",
    questions: [
      { q: "Sternberg's Triarchic Theory includes:", opts: ["Analytical, Creative, and Practical intelligence", "g and s factors", "7 primary abilities", "Emotional and social intelligence"], ans: 0, topic: "Intelligence & Aptitude" },
      { q: "A person consistently blaming themselves for failures shows:", opts: ["External attribution", "Internal stable attribution", "Situational attribution", "Dispositional optimism"], ans: 1, topic: "Attitude & Social Cognition" },
      { q: "Which of the following is NOT a type of coping with stress?", opts: ["Problem-focused coping", "Emotion-focused coping", "Avoidance coping", "Attribution coping"], ans: 3, topic: "Stress & Coping" },
      { q: "Obsessive Compulsive Disorder (OCD) falls under:", opts: ["Psychotic disorders", "Mood disorders", "Anxiety-related disorders", "Dissociative disorders"], ans: 2, topic: "Psychological Disorders" },
      { q: "Client-Centred Therapy was developed by:", opts: ["Freud", "Beck", "Carl Rogers", "Skinner"], ans: 2, topic: "Therapeutic Approaches" },
      { q: "Which of the following is a group-level influence on behaviour?", opts: ["Sensation", "Perception", "Groupthink", "Individual cognition"], ans: 2, topic: "Social Influence" },
      { q: "The Thematic Apperception Test (TAT) was developed by:", opts: ["Rorschach", "Murray and Morgan", "Freud", "Jung"], ans: 1, topic: "Self & Personality" },
      { q: "Positive reinforcement in behaviour therapy involves:", opts: ["Removing a pleasant stimulus", "Adding a pleasant stimulus after desired behaviour", "Punishment after undesired behaviour", "Ignoring all behaviour"], ans: 1, topic: "Therapeutic Approaches" },
      { q: "Burnout is most closely associated with:", opts: ["Eustress", "Acute stress", "Chronic occupational stress", "Post-traumatic stress"], ans: 2, topic: "Stress & Coping" },
      { q: "Which of the following is an example of a primary prevention in mental health?", opts: ["Treating diagnosed patients", "Rehabilitation after recovery", "Reducing risk factors in the general population", "Medication for disorders"], ans: 2, topic: "Therapeutic Approaches" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE 12 — Computer Science (Python)
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-12-cs-2024",
    board: "CBSE", subject: "Computer Science", grade: "Class 12", year: 2024, difficulty: "Medium",
    questions: [
      { q: "Which Python function reads a single line from a text file?", opts: ["read()", "readline()", "readlines()", "getline()"], ans: 1, topic: "File Handling" },
      { q: "What is the output of type(10/3) in Python 3?", opts: ["int", "float", "double", "long"], ans: 1, topic: "Python Basics" },
      { q: "Which SQL command removes all rows from a table without deleting its structure?", opts: ["DELETE", "DROP", "TRUNCATE", "REMOVE"], ans: 2, topic: "SQL & DBMS" },
      { q: "A primary key must be:", opts: ["Unique and may be NULL", "Unique and NOT NULL", "Duplicate allowed", "Auto-increment only"], ans: 1, topic: "SQL & DBMS" },
      { q: "In a stack, the last element inserted is:", opts: ["First to be deleted (LIFO)", "Last to be deleted", "Cannot be deleted", "Deleted randomly"], ans: 0, topic: "Data Structures" },
      { q: "Which network topology connects all nodes to a central hub?", opts: ["Ring", "Bus", "Star", "Mesh"], ans: 2, topic: "Computer Networks" },
      { q: "IP address 192.168.1.1 belongs to which class?", opts: ["Class A", "Class B", "Class C", "Class D"], ans: 2, topic: "Computer Networks" },
      { q: "SELECT DISTINCT in SQL returns:", opts: ["All records", "Only unique records", "First record only", "Sorted records"], ans: 1, topic: "SQL & DBMS" },
      { q: "Which Python keyword handles runtime exceptions?", opts: ["catch", "error", "except", "handle"], ans: 2, topic: "Python Basics" },
      { q: "The OSI reference model has how many layers?", opts: ["4", "5", "6", "7"], ans: 3, topic: "Computer Networks" },
    ],
  },

  {
    id: "cbse-12-cs-2023",
    board: "CBSE", subject: "Computer Science", grade: "Class 12", year: 2023, difficulty: "Medium",
    questions: [
      { q: "A function defined inside another function in Python is called:", opts: ["Lambda function", "Nested function", "Recursive function", "Anonymous function"], ans: 1, topic: "Python Functions" },
      { q: "Which SQL clause filters results after GROUP BY?", opts: ["WHERE", "HAVING", "FILTER", "AND"], ans: 1, topic: "SQL & DBMS" },
      { q: "Which data structure follows First-In-First-Out (FIFO)?", opts: ["Stack", "Queue", "Tree", "Graph"], ans: 1, topic: "Data Structures" },
      { q: "A foreign key in a table references the ___ of another table:", opts: ["Foreign key", "Primary key", "Candidate key", "Composite key"], ans: 1, topic: "SQL & DBMS" },
      { q: "Python file mode 'a' opens a file for:", opts: ["Read only", "Write (overwrite from start)", "Append at end", "Binary read"], ans: 2, topic: "File Handling" },
      { q: "Which protocol handles email transmission between servers?", opts: ["HTTP", "FTP", "SMTP", "TCP"], ans: 2, topic: "Computer Networks" },
      { q: "DNS (Domain Name System) converts:", opts: ["IP to MAC address", "Domain names to IP addresses", "Data to packets", "HTTP to HTTPS"], ans: 1, topic: "Computer Networks" },
      { q: "Worst-case time complexity of linear search:", opts: ["O(1)", "O(log n)", "O(n)", "O(n²)"], ans: 2, topic: "Data Structures" },
      { q: "Which of the following is a mutable data type in Python?", opts: ["Tuple", "String", "List", "Integer"], ans: 2, topic: "Python Basics" },
      { q: "Normalization in DBMS primarily aims to:", opts: ["Increase redundancy", "Speed up queries only", "Reduce redundancy and anomalies", "Add more tables"], ans: 2, topic: "SQL & DBMS" },
    ],
  },

  {
    id: "cbse-12-cs-2022",
    board: "CBSE", subject: "Computer Science", grade: "Class 12", year: 2022, difficulty: "Medium",
    questions: [
      { q: "What is the output of len('Hello World') in Python?", opts: ["10", "11", "9", "12"], ans: 1, topic: "Python Basics" },
      { q: "Which SQL command modifies existing records in a table?", opts: ["INSERT", "ALTER", "UPDATE", "MODIFY"], ans: 2, topic: "SQL & DBMS" },
      { q: "Which Python list method adds an element at the end?", opts: ["insert()", "add()", "append()", "push()"], ans: 2, topic: "Python Basics" },
      { q: "The 'degree' of a relation in DBMS refers to:", opts: ["Number of rows (tuples)", "Number of columns (attributes)", "Number of primary keys", "Number of foreign keys"], ans: 1, topic: "SQL & DBMS" },
      { q: "Which OSI layer handles data encryption and compression?", opts: ["Session layer", "Transport layer", "Presentation layer", "Application layer"], ans: 2, topic: "Computer Networks" },
      { q: "Python's file.tell() method returns:", opts: ["File name", "Current cursor position", "File size", "Number of lines"], ans: 1, topic: "File Handling" },
      { q: "Network bandwidth is measured in:", opts: ["Hertz", "Bytes", "Bits per second (bps)", "Watts"], ans: 2, topic: "Computer Networks" },
      { q: "A Python tuple is:", opts: ["Mutable ordered sequence", "Immutable ordered sequence", "Unordered collection", "Key-value pairs"], ans: 1, topic: "Python Basics" },
      { q: "The pop() operation in a stack removes from:", opts: ["Bottom", "Middle", "Top", "Any position"], ans: 2, topic: "Data Structures" },
      { q: "Which is NOT a valid SQL JOIN type?", opts: ["INNER JOIN", "LEFT JOIN", "FULL OUTER JOIN", "DIAGONAL JOIN"], ans: 3, topic: "SQL & DBMS" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CBSE 12 — Psychology 2021 & 2020
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: "cbse-12-psy-2021",
    board: "CBSE", subject: "Psychology", grade: "Class 12", year: 2021, difficulty: "Medium",
    questions: [
      { q: "The concept of 'collective unconscious' was proposed by:", opts: ["Freud", "Adler", "Carl Jung", "Erikson"], ans: 2, topic: "Self & Personality" },
      { q: "Intelligence Quotient (IQ) is calculated as:", opts: ["CA/MA × 100", "MA/CA × 100", "MA + CA", "MA − CA"], ans: 1, topic: "Intelligence & Aptitude" },
      { q: "Which scale of measurement allows calculation of ratio?", opts: ["Nominal", "Ordinal", "Interval", "Ratio"], ans: 3, topic: "Psychological Assessment" },
      { q: "Post-Traumatic Stress Disorder (PTSD) is classified under:", opts: ["Mood disorders", "Trauma and stressor-related disorders", "Personality disorders", "Psychotic disorders"], ans: 1, topic: "Psychological Disorders" },
      { q: "Token economy is a technique used in:", opts: ["Psychoanalysis", "Behaviour therapy", "Humanistic therapy", "Gestalt therapy"], ans: 1, topic: "Therapeutic Approaches" },
      { q: "The 'fundamental attribution error' refers to:", opts: ["Blaming situations for others' failures", "Overemphasising dispositional factors for others' behaviour", "Underestimating one's own role", "Bias towards in-group members"], ans: 1, topic: "Attitude & Social Cognition" },
      { q: "Bystander effect means people are less likely to help when:", opts: ["They are alone", "Others are present (diffusion of responsibility)", "The victim is known", "The situation is clear"], ans: 1, topic: "Social Influence" },
      { q: "The Wechsler scale measures intelligence using:", opts: ["Only verbal tasks", "Only performance tasks", "Both verbal and performance subtests", "Only abstract reasoning"], ans: 2, topic: "Intelligence & Aptitude" },
      { q: "Stress inoculation training is associated with:", opts: ["Meichenbaum", "Aaron Beck", "Rogers", "Freud"], ans: 0, topic: "Stress & Coping" },
      { q: "Which of the following is an example of secondary appraisal in stress?", opts: ["Judging whether a situation is threatening", "Evaluating available coping resources", "Perceiving physical symptoms", "Experiencing emotional arousal"], ans: 1, topic: "Stress & Coping" },
    ],
  },

  {
    id: "cbse-12-psy-2020",
    board: "CBSE", subject: "Psychology", grade: "Class 12", year: 2020, difficulty: "Medium",
    questions: [
      { q: "Aptitude tests measure:", opts: ["Current knowledge", "Potential to learn a specific skill", "Personality traits", "Emotional stability"], ans: 1, topic: "Intelligence & Aptitude" },
      { q: "Type A personality is characterised by:", opts: ["Relaxed and easy-going behaviour", "Competitiveness, hostility and time urgency", "Introversion and low motivation", "High empathy and creativity"], ans: 1, topic: "Self & Personality" },
      { q: "Which defence mechanism involves channelling unacceptable impulses into socially acceptable activities?", opts: ["Repression", "Projection", "Sublimation", "Rationalisation"], ans: 2, topic: "Self & Personality" },
      { q: "The three phases of GAS (General Adaptation Syndrome) in order:", opts: ["Alarm → Exhaustion → Resistance", "Resistance → Alarm → Exhaustion", "Alarm → Resistance → Exhaustion", "Exhaustion → Resistance → Alarm"], ans: 2, topic: "Stress & Coping" },
      { q: "Dissociative Identity Disorder was previously known as:", opts: ["Schizophrenia", "Multiple Personality Disorder", "Bipolar disorder", "Conversion disorder"], ans: 1, topic: "Psychological Disorders" },
      { q: "Systematic desensitisation is used primarily to treat:", opts: ["Schizophrenia", "Depression", "Phobias and anxiety", "Personality disorders"], ans: 2, topic: "Therapeutic Approaches" },
      { q: "Prejudice is an attitude that involves:", opts: ["Objective evaluation of a group", "Negative pre-judgement of a social group", "Factual belief about individuals", "Positive stereotypes only"], ans: 1, topic: "Attitude & Social Cognition" },
      { q: "The concept of 'deindividuation' refers to:", opts: ["Increased self-awareness in groups", "Loss of self-awareness and personal responsibility in groups", "Individual problem-solving", "Leadership emergence"], ans: 1, topic: "Social Influence" },
      { q: "Electroconvulsive Therapy (ECT) is used primarily for:", opts: ["Schizophrenia", "Severe depression unresponsive to medication", "Anxiety disorders", "Personality disorders"], ans: 1, topic: "Therapeutic Approaches" },
      { q: "An attitude has three components: cognitive, affective, and:", opts: ["Social", "Behavioural (conative)", "Cultural", "Biological"], ans: 1, topic: "Attitude & Social Cognition" },
    ],
  },
];
