# MocapViz

JavaScript library for visualizing motion capture data.

## Installation

### Option 1

Download the minimised module file from releases. Copy the module file into your project folder.

### Option 2

Clone the repository, copy the `lib` folder along with `mocap.js`, `mocapCore.js` and `model.js` into your project folder.

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
