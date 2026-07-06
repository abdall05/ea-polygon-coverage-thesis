# EA Polygon Coverage Platform

This repository contains the implementation of a browser-based platform for studying evolutionary algorithms on a two-dimensional point coverage problem. Candidate solutions are represented as polygons that evolve to cover points in the unit square.

The platform was developed as part of a master's thesis at the University of Passau. It is intended as a lightweight experimental environment for configuring, running, visualising, and comparing evolutionary algorithm configurations.

## Features

* Interactive evolutionary algorithm execution in the browser
* 2D point coverage benchmark with polygonal candidate solutions
* Multiple polygon representations
* Configurable mutation and crossover operators
* Visualisation of the search process
* Lineage inspection
* Locality analysis
* Population diversity computation
* Repeated-run experiments
* Metric export and statistical comparison of configurations

## Requirements

* Node.js
* npm

## Installation

Clone the repository and install the dependencies:

```bash
npm install
```

## Development Mode

To run the platform locally in development mode:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Production Build

To create a production build:

```bash
npm run build
```

The generated files will be placed in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

Then open:

```text
http://localhost:3000
```

## Live Demo

A static live demo of the platform is available at:

```text
https://polygon-coverage-ea.netlify.app/
```

## Reproducibility

The platform runs fully in the browser. No backend server is required for the implemented experiments. The source code, configuration options, and build instructions are provided in this repository so that the platform can be run locally and inspected.

## Thesis Context

The platform is used in the thesis as a proof-of-concept environment for studying how representation, mutation, and crossover choices affect evolutionary search behaviour on a visually interpretable 2D point coverage problem.

## License

This project is provided for academic and demonstration purposes.
