/**
 * CBSE PHYSICS — Class 11 & 12. The canonical v1 taxonomy.
 *
 * Data only. No logic lives here, and no logic should: a new subject is a new
 * file of this shape, never a code change. Chemistry, Mathematics and Biology
 * slot in beside this one as sibling roots.
 *
 * STRUCTURE follows PRODUCT_DECISIONS §4.2 — subject → chapter → topic →
 * concept. Class is NOT a tree level; it is carried in the board code, so a
 * subject whose year groupings differ (Maths streams, Biology's Botany/Zoology
 * split) needs no schema or hierarchy change.
 *
 * CHAPTERS follow the rationalised NCERT syllabus in force from 2023-24
 * (14 chapters per class; the former "Physical World" chapter is not included).
 *
 * EXAM WEIGHTS are the CBSE published unit-wise mark allocations for the 70-mark
 * theory paper. The board publishes marks per UNIT, not per chapter, so a unit
 * group's marks are divided evenly across its chapters. That even split is an
 * explicit modelling assumption, not published data — it is stated here rather
 * than presented as fact, and refining it against real marked papers is exactly
 * what §4.2 means by "refined forever".
 *
 *   Class 11 — Units I+II+III 23 · IV+V 17 · VI+VII+VIII+IX 20 · X 10  = 70
 *   Class 12 — Units I+II 16 · III+IV 17 · V+VI 18 · VII+VIII 12 · IX 7 = 70
 */

import type { Syllabus } from './build';

/** Marks per chapter, derived from the published unit totals above. */
const W = {
  c11_mechanics_core: 23 / 4,      // Units I–III over 4 chapters
  c11_energy_rotation: 17 / 2,     // Units IV–V over 2 chapters
  c11_matter_thermal: 20 / 6,      // Units VI–IX over 6 chapters
  c11_oscillations_waves: 10 / 2,  // Unit X over 2 chapters
  c12_electro: 16 / 3,             // Units I–II over 3 chapters
  c12_magnetism_emi: 17 / 4,       // Units III–IV over 4 chapters
  c12_waves_optics: 18 / 3,        // Units V–VI over 3 chapters
  c12_modern: 12 / 3,              // Units VII–VIII over 3 chapters
  c12_devices: 7,                  // Unit IX, one chapter
} as const;

export const CBSE_PHYSICS: Syllabus = {
  subject: 'Physics',
  board: 'CBSE',
  subjectCode: 'PHY',
  chapters: [
    // ═══════════════════════ CLASS 11 ═══════════════════════
    {
      name: 'Units and Measurements', cls: 11, number: 1,
      unit: 'I — Physical World and Measurement', examWeight: W.c11_mechanics_core,
      topics: [
        { name: 'Units and Dimensions', concepts: [
          'Dimensional formula of a derived quantity',
          'Dimensional analysis to check an equation',
          'Limitations of dimensional analysis',
        ]},
        { name: 'Errors in Measurement', concepts: [
          'Absolute, relative and percentage error',
          'Propagation of error through sums and products',
          'Least count and instrument error',
        ]},
        { name: 'Significant Figures', concepts: [
          'Counting significant figures',
          'Rounding rules in arithmetic operations',
        ]},
      ],
    },
    {
      name: 'Motion in a Straight Line', cls: 11, number: 2,
      unit: 'II — Kinematics', examWeight: W.c11_mechanics_core,
      topics: [
        { name: 'Describing Motion', concepts: [
          'Distance versus displacement',
          'Average versus instantaneous velocity',
          'Sign convention for one-dimensional motion',
        ]},
        { name: 'Uniformly Accelerated Motion', concepts: [
          'Selecting the correct kinematic equation',
          'Motion under gravity with upward positive',
          'Stopping distance and reaction time',
        ]},
        { name: 'Graphical Analysis', concepts: [
          'Reading velocity from a position–time slope',
          'Reading displacement from area under velocity–time',
        ]},
      ],
    },
    {
      name: 'Motion in a Plane', cls: 11, number: 3,
      unit: 'II — Kinematics', examWeight: W.c11_mechanics_core,
      topics: [
        { name: 'Vector Algebra', concepts: [
          'Resolving a vector into components',
          'Triangle and parallelogram laws of addition',
          'Scalar and vector products',
        ]},
        { name: 'Projectile Motion', concepts: [
          'Independence of horizontal and vertical motion',
          'Time of flight, maximum height and range',
          'Projectile launched from a height',
        ]},
        { name: 'Circular Motion', concepts: [
          'Angular velocity and its relation to linear velocity',
          'Centripetal acceleration',
        ]},
      ],
    },
    {
      name: 'Laws of Motion', cls: 11, number: 4,
      unit: 'III — Laws of Motion', examWeight: W.c11_mechanics_core,
      topics: [
        { name: 'Newton’s Laws', concepts: [
          'Identifying the system before applying the second law',
          'Action–reaction pairs act on different bodies',
          'Impulse and change of momentum',
        ]},
        { name: 'Free Body Diagrams', concepts: [
          'Normal reaction on an inclined plane',
          'Tension in connected bodies over a pulley',
          'Pseudo force in a non-inertial frame',
        ]},
        { name: 'Friction', concepts: [
          'Static versus kinetic friction',
          'Angle of repose',
        ]},
        { name: 'Dynamics of Circular Motion', concepts: [
          'Banking of roads',
          'Vertical circle and minimum speed',
        ]},
      ],
    },
    {
      name: 'Work, Energy and Power', cls: 11, number: 5,
      unit: 'IV — Work, Energy and Power', examWeight: W.c11_energy_rotation,
      topics: [
        { name: 'Work and Energy', concepts: [
          'Work done by a variable force',
          'Work–energy theorem',
          'Sign of work done by friction and gravity',
        ]},
        { name: 'Conservation of Energy', concepts: [
          'Conservative versus non-conservative forces',
          'Potential energy of a spring',
          'Mechanical energy conservation in a vertical drop',
        ]},
        { name: 'Collisions', concepts: [
          'Elastic collision in one dimension',
          'Perfectly inelastic collision and energy loss',
          'Coefficient of restitution',
        ]},
      ],
    },
    {
      name: 'System of Particles and Rotational Motion', cls: 11, number: 6,
      unit: 'V — Motion of System of Particles and Rigid Body', examWeight: W.c11_energy_rotation,
      topics: [
        { name: 'Centre of Mass', concepts: [
          'Locating the centre of mass of a discrete system',
          'Motion of the centre of mass under external force',
        ]},
        { name: 'Torque and Equilibrium', concepts: [
          'Sign convention for torque',
          'Conditions for rotational equilibrium',
        ]},
        { name: 'Moment of Inertia', concepts: [
          'Parallel axis theorem',
          'Perpendicular axis theorem',
          'Radius of gyration',
        ]},
        { name: 'Angular Momentum', concepts: [
          'Conservation of angular momentum',
          'Rolling without slipping',
          'Relating torque to angular acceleration',
        ]},
      ],
    },
    {
      name: 'Gravitation', cls: 11, number: 7,
      unit: 'VI — Gravitation', examWeight: W.c11_matter_thermal,
      topics: [
        { name: 'Universal Gravitation', concepts: [
          'Newton’s law of gravitation',
          'Variation of g with altitude and depth',
        ]},
        { name: 'Gravitational Potential Energy', concepts: [
          'Sign of gravitational potential energy',
          'Escape velocity',
        ]},
        { name: 'Satellites', concepts: [
          'Orbital velocity and time period',
          'Geostationary versus polar orbits',
          'Kepler’s laws',
        ]},
      ],
    },
    {
      name: 'Mechanical Properties of Solids', cls: 11, number: 8,
      unit: 'VII — Properties of Bulk Matter', examWeight: W.c11_matter_thermal,
      topics: [
        { name: 'Stress and Strain', concepts: [
          'Types of stress and corresponding strain',
          'Stress–strain curve and elastic limit',
        ]},
        { name: 'Elastic Moduli', concepts: [
          'Young’s modulus',
          'Bulk modulus and modulus of rigidity',
          'Elastic potential energy per unit volume',
        ]},
      ],
    },
    {
      name: 'Mechanical Properties of Fluids', cls: 11, number: 9,
      unit: 'VII — Properties of Bulk Matter', examWeight: W.c11_matter_thermal,
      topics: [
        { name: 'Pressure in Fluids', concepts: [
          'Variation of pressure with depth',
          'Pascal’s law and hydraulic systems',
          'Archimedes principle and apparent weight',
        ]},
        { name: 'Fluid Dynamics', concepts: [
          'Equation of continuity',
          'Bernoulli’s principle and its applications',
        ]},
        { name: 'Viscosity and Surface Tension', concepts: [
          'Stokes law and terminal velocity',
          'Excess pressure inside a drop and a bubble',
          'Capillary rise',
        ]},
      ],
    },
    {
      name: 'Thermal Properties of Matter', cls: 11, number: 10,
      unit: 'VII — Properties of Bulk Matter', examWeight: W.c11_matter_thermal,
      topics: [
        { name: 'Thermal Expansion', concepts: [
          'Linear, areal and volume expansion coefficients',
          'Thermal stress in a constrained rod',
        ]},
        { name: 'Calorimetry', concepts: [
          'Specific heat capacity and heat exchange',
          'Latent heat and change of state',
        ]},
        { name: 'Heat Transfer', concepts: [
          'Conduction and thermal resistance in series',
          'Newton’s law of cooling',
          'Stefan’s law and black body radiation',
        ]},
      ],
    },
    {
      name: 'Thermodynamics', cls: 11, number: 11,
      unit: 'VIII — Thermodynamics', examWeight: W.c11_matter_thermal,
      topics: [
        { name: 'First Law', concepts: [
          'Sign convention for heat and work',
          'Internal energy as a state function',
          'Work done in isothermal and adiabatic processes',
        ]},
        { name: 'Thermodynamic Processes', concepts: [
          'Isobaric, isochoric, isothermal and adiabatic compared',
          'Cyclic process and net work from a P–V loop',
        ]},
        { name: 'Second Law and Engines', concepts: [
          'Efficiency of a heat engine',
          'Carnot cycle and its limit',
          'Coefficient of performance of a refrigerator',
        ]},
      ],
    },
    {
      name: 'Kinetic Theory', cls: 11, number: 12,
      unit: 'IX — Behaviour of Perfect Gases and Kinetic Theory', examWeight: W.c11_matter_thermal,
      topics: [
        { name: 'Kinetic Theory of Gases', concepts: [
          'Pressure of an ideal gas from molecular motion',
          'RMS, average and most probable speeds',
        ]},
        { name: 'Degrees of Freedom', concepts: [
          'Law of equipartition of energy',
          'Specific heats of mono-, di- and polyatomic gases',
          'Mean free path',
        ]},
      ],
    },
    {
      name: 'Oscillations', cls: 11, number: 13,
      unit: 'X — Oscillations and Waves', examWeight: W.c11_oscillations_waves,
      topics: [
        { name: 'Simple Harmonic Motion', concepts: [
          'Displacement, velocity and acceleration in SHM',
          'Phase and phase difference',
          'Energy in SHM',
        ]},
        { name: 'Oscillating Systems', concepts: [
          'Time period of a spring–mass system',
          'Simple pendulum and its assumptions',
          'Damped and forced oscillations, resonance',
        ]},
      ],
    },
    {
      name: 'Waves', cls: 11, number: 14,
      unit: 'X — Oscillations and Waves', examWeight: W.c11_oscillations_waves,
      topics: [
        { name: 'Wave Motion', concepts: [
          'Transverse versus longitudinal waves',
          'The travelling wave equation',
          'Speed of a wave on a stretched string',
        ]},
        { name: 'Superposition', concepts: [
          'Standing waves and nodes',
          'Harmonics in open and closed pipes',
          'Beats',
        ]},
        { name: 'Doppler Effect', concepts: [
          'Doppler shift for a moving source and observer',
        ]},
      ],
    },

    // ═══════════════════════ CLASS 12 ═══════════════════════
    {
      name: 'Electric Charges and Fields', cls: 12, number: 1,
      unit: 'I — Electrostatics', examWeight: W.c12_electro,
      topics: [
        { name: 'Coulomb’s Law', concepts: [
          'Force between point charges',
          'Superposition of forces from multiple charges',
          'Effect of a dielectric medium',
        ]},
        { name: 'Electric Field', concepts: [
          'Field due to a point charge and a dipole',
          'Torque on a dipole in a uniform field',
          'Field lines and their properties',
        ]},
        { name: 'Gauss’s Law', concepts: [
          'Choosing a Gaussian surface',
          'Field of an infinite sheet, wire and shell',
        ]},
      ],
    },
    {
      name: 'Electrostatic Potential and Capacitance', cls: 12, number: 2,
      unit: 'I — Electrostatics', examWeight: W.c12_electro,
      topics: [
        { name: 'Electric Potential', concepts: [
          'Potential due to a point charge and a system',
          'Relation between field and potential gradient',
          'Equipotential surfaces',
        ]},
        { name: 'Capacitance', concepts: [
          'Parallel plate capacitor with and without dielectric',
          'Capacitors in series and parallel',
          'Energy stored in a capacitor',
        ]},
        { name: 'Conductors and Dielectrics', concepts: [
          'Electrostatic shielding',
          'Polarisation and dielectric constant',
        ]},
      ],
    },
    {
      name: 'Current Electricity', cls: 12, number: 3,
      unit: 'II — Current Electricity', examWeight: W.c12_electro,
      topics: [
        { name: 'Ohm’s Law and Resistance', concepts: [
          'Drift velocity and its relation to current',
          'Resistivity and its temperature dependence',
          'Resistors in series and parallel',
        ]},
        { name: 'Circuit Analysis', concepts: [
          'Kirchhoff’s junction and loop rules',
          'Sign convention when traversing a loop',
          'Wheatstone bridge balance condition',
        ]},
        { name: 'EMF and Internal Resistance', concepts: [
          'Terminal potential difference versus EMF',
          'Cells in series and parallel',
          'Maximum power transfer',
        ]},
      ],
    },
    {
      name: 'Moving Charges and Magnetism', cls: 12, number: 4,
      unit: 'III — Magnetic Effects of Current and Magnetism', examWeight: W.c12_magnetism_emi,
      topics: [
        { name: 'Magnetic Force', concepts: [
          'Lorentz force and its direction',
          'Motion of a charge in a uniform magnetic field',
          'Force on a current-carrying conductor',
        ]},
        { name: 'Biot–Savart and Ampere', concepts: [
          'Field on the axis of a circular loop',
          'Ampere’s circuital law applied to a solenoid',
          'Force between parallel currents',
        ]},
        { name: 'Instruments', concepts: [
          'Moving coil galvanometer and its sensitivity',
          'Converting a galvanometer to an ammeter or voltmeter',
          'Cyclotron and its frequency',
        ]},
      ],
    },
    {
      name: 'Magnetism and Matter', cls: 12, number: 5,
      unit: 'III — Magnetic Effects of Current and Magnetism', examWeight: W.c12_magnetism_emi,
      topics: [
        { name: 'Magnetic Dipoles', concepts: [
          'Bar magnet as an equivalent solenoid',
          'Torque and potential energy of a dipole',
        ]},
        { name: 'Magnetic Materials', concepts: [
          'Diamagnetic, paramagnetic and ferromagnetic behaviour',
          'Susceptibility and permeability',
          'Hysteresis and its interpretation',
        ]},
      ],
    },
    {
      name: 'Electromagnetic Induction', cls: 12, number: 6,
      unit: 'IV — Electromagnetic Induction and Alternating Currents', examWeight: W.c12_magnetism_emi,
      topics: [
        { name: 'Faraday and Lenz', concepts: [
          'Magnetic flux and its change',
          'Lenz’s law and the direction of induced current',
          'Motional EMF',
        ]},
        { name: 'Inductance', concepts: [
          'Self inductance of a solenoid',
          'Mutual inductance between coils',
          'Energy stored in an inductor',
        ]},
        { name: 'Eddy Currents', concepts: [
          'Eddy currents and their applications',
        ]},
      ],
    },
    {
      name: 'Alternating Current', cls: 12, number: 7,
      unit: 'IV — Electromagnetic Induction and Alternating Currents', examWeight: W.c12_magnetism_emi,
      topics: [
        { name: 'AC Quantities', concepts: [
          'RMS and peak values',
          'Phase relations in pure R, L and C',
        ]},
        { name: 'Series LCR Circuit', concepts: [
          'Impedance and the phasor diagram',
          'Resonance and resonant frequency',
          'Power factor and wattless current',
        ]},
        { name: 'Transformers', concepts: [
          'Turns ratio and the ideal transformer',
          'Sources of energy loss in a transformer',
        ]},
      ],
    },
    {
      name: 'Electromagnetic Waves', cls: 12, number: 8,
      unit: 'V — Electromagnetic Waves', examWeight: W.c12_waves_optics,
      topics: [
        { name: 'Nature of EM Waves', concepts: [
          'Displacement current',
          'Transverse nature and field orientation',
          'Energy density and intensity',
        ]},
        { name: 'The Spectrum', concepts: [
          'Ordering the electromagnetic spectrum',
          'Uses and sources of each band',
        ]},
      ],
    },
    {
      name: 'Ray Optics and Optical Instruments', cls: 12, number: 9,
      unit: 'VI — Optics', examWeight: W.c12_waves_optics,
      topics: [
        { name: 'Reflection and Refraction', concepts: [
          'Sign convention for mirrors and lenses',
          'Mirror formula and magnification',
          'Refraction at a spherical surface',
        ]},
        { name: 'Total Internal Reflection', concepts: [
          'Critical angle and conditions for TIR',
          'Optical fibres and prisms',
        ]},
        { name: 'Lenses and Prisms', concepts: [
          'Lens maker’s formula',
          'Combination of thin lenses in contact',
          'Angle of deviation and dispersion by a prism',
        ]},
        { name: 'Optical Instruments', concepts: [
          'Magnifying power of a compound microscope',
          'Magnifying power of a telescope',
        ]},
      ],
    },
    {
      name: 'Wave Optics', cls: 12, number: 10,
      unit: 'VI — Optics', examWeight: W.c12_waves_optics,
      topics: [
        { name: 'Huygens Principle', concepts: [
          'Wavefront construction',
          'Explaining reflection and refraction by wavefronts',
        ]},
        { name: 'Interference', concepts: [
          'Conditions for sustained interference',
          'Young’s double slit fringe width',
          'Effect of changing wavelength or medium on fringes',
        ]},
        { name: 'Diffraction and Polarisation', concepts: [
          'Single slit diffraction minima',
          'Malus’s law',
          'Brewster’s angle',
        ]},
      ],
    },
    {
      name: 'Dual Nature of Radiation and Matter', cls: 12, number: 11,
      unit: 'VII — Dual Nature of Radiation and Matter', examWeight: W.c12_modern,
      topics: [
        { name: 'Photoelectric Effect', concepts: [
          'Threshold frequency and work function',
          'Einstein’s photoelectric equation',
          'Stopping potential and its dependence on intensity',
        ]},
        { name: 'Matter Waves', concepts: [
          'de Broglie wavelength',
          'Wavelength of an accelerated electron',
        ]},
      ],
    },
    {
      name: 'Atoms', cls: 12, number: 12,
      unit: 'VIII — Atoms and Nuclei', examWeight: W.c12_modern,
      topics: [
        { name: 'Atomic Models', concepts: [
          'Rutherford scattering and the nuclear atom',
          'Limitations of the Rutherford model',
        ]},
        { name: 'Bohr Model', concepts: [
          'Bohr’s postulates and quantisation',
          'Radius and energy of the nth orbit',
          'Hydrogen spectral series',
        ]},
      ],
    },
    {
      name: 'Nuclei', cls: 12, number: 13,
      unit: 'VIII — Atoms and Nuclei', examWeight: W.c12_modern,
      topics: [
        { name: 'Nuclear Structure', concepts: [
          'Mass defect and binding energy',
          'Binding energy per nucleon curve',
          'Nuclear density independence from mass number',
        ]},
        { name: 'Radioactivity', concepts: [
          'Law of radioactive decay',
          'Half life and mean life',
          'Alpha, beta and gamma decay compared',
        ]},
        { name: 'Fission and Fusion', concepts: [
          'Energy release in fission and fusion',
        ]},
      ],
    },
    {
      name: 'Semiconductor Electronics: Materials, Devices and Simple Circuits', cls: 12, number: 14,
      unit: 'IX — Electronic Devices', examWeight: W.c12_devices,
      topics: [
        { name: 'Semiconductors', concepts: [
          'Intrinsic versus extrinsic semiconductors',
          'n-type and p-type doping',
          'Energy band picture of conductors, semiconductors and insulators',
        ]},
        { name: 'p-n Junction', concepts: [
          'Depletion region and barrier potential',
          'Forward and reverse bias characteristics',
        ]},
        { name: 'Diode Applications', concepts: [
          'Half wave and full wave rectification',
          'Zener diode as a voltage regulator',
          'Light emitting diode, photodiode and solar cell',
        ]},
      ],
    },
  ],
};
