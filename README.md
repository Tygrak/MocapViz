# MocapViz

JavaScript library for visualizing motion capture data.

## Installation

### Option 1 - Recommended

Download the minimised module file from releases. Copy the module file into your project folder.

### Option 2

Clone the repository, use `npx webpack` to create a module file. Copy the module file into your project folder.

### Option 3

Clone the repository, copy the contents of `src` into your project folder.

## Usage Example

```javascript
    import * as Mocap from './mocap.js';

    Mocap.loadDataFromFile(dataFile, (sequences) => {
        let factory = new Mocap.VisualizationFactory();
        let visualizationElement = factory.createVisualization(sequences[0], 850, 250, 250, 250);
        document.body.appendChild(visualizationElement);
    });
```

## Full Scripting Documentation

[Documentation](docs/DOCUMENTATION.md)

## Examples

Some examples using this library are available in the `examples` folder. To start off, see the file `example.html`.

### Live Sites of Examples

[example.html - most basic example, showing loading a data file and creating a visualization](https://tygrak.github.io/MocapViz/examples/example.html)

[multiView.html - shows off most features of mocapViz](https://tygrak.github.io/MocapViz/examples/multiView.html)

[categories.html - loads and visualizes all sequences of a selected category from a data file](https://tygrak.github.io/MocapViz/examples/categories.html)

[tester.html - used for our user testing](https://tygrak.github.io/MocapViz/examples/tester2.html)
