# Getting Started

This is a short tutorial showing how to create a simple site that can create a visualization from a file.

You can test the resulting website [here](https://tygrak.github.io/MocapViz/examples/example.html).

## Before We Start

Create a new folder somewhere on your computer. Create a html file inside it -- for example named `example.html`. Download the latest minified module file from [releases](https://github.com/Tygrak/MocapViz/releases/) and add it to our folder. Open our `.html` file and paste in the following code:

```html
<html>
    <head>
        <meta charset="utf-8" />
        <title>
            MocapViz Test
        </title>     
    </head>
    <body>
        <button id="dataLoadButton">Load Data</button>
        <input type="file" id="dataFileInput" name="dataFileInput" accept=".data,.txt">
        <script type="module">
            // We will add our Javascript code here.
        </script>  
    </body>
</html>
```

Opening the site shows us two buttons. One of the buttons allows us to select a file using the file browser, the user will use this button to upload their data files. The second button does nothing for now, but we will hook it up to create a visualization using the file provided when pressed.

## Importing the Library

Let's start by importing the MocapViz library. Start our Javascript code with this line:

```javascript
import * as Mocap from './mocap.min.js';
```

This imports the library, and allows us to use it by calling functions from it with `Mocap.*nameOfFunction*`.

*If we didn't want to use ES6 modules, we would instead download the non module file from releases and include the libraries file in the HTML like this `<script src="mocap.js"></script>`.*

## Loading Data

To create a visualization, we first need to load the data from which we will create it. When loading data, we have two options. The first is useful if we have the data prepared in a string somewhere already, for example if the data is already ready on our server. We would use the function `loadDataFromString(dataString)`. The second option allows us to load data from a file, which is useful to let the user provide their own data files. This is the function `loadDataFromFile(dataFile, callback)`. Both functions return an array of sequences, ready to be further used. We will use the second option for our example, as we want the user to provide their own file.

The `loadDataFromFile(dataFile, callback)` function takes two arguments. The first is the blob of the data file. We will get the blob using the file input we have previously defined in our HTML. Let us add some code, so we can access the input. Also, while we are at it, let's add a function that will be called when we press the load button.

```javascript
import * as Mocap from './mocap.min.js';

const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataLoadButton");
loadButton.onclick = load;

function load() {
}
```

Now, to get the file selected from the input element we can use `dataFileInput.files[0]`. We should also first perform a check to see if the user actually selected a file. This covers the first argument of `loadDataFromFile`. Now what is this second argument, the `callback`? Callback is a function, that will be called when the function finishes loading our file. The function is given one argument containing the sequences loaded. So now we can call `loadDataFromFile` and log the amount of sequences loaded into the console.

```javascript
function load() {
    if (dataFileInput.files.length == 0) {
        console.log("No file selected!");
        return;
    }
    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        console.log("Loaded " + sequences.length + " sequences!");
    });
}
```

## Creating a Visualization

We have loaded the data, now we just need to create a visualization using it. To do this we will use the helpful class `VisualizationFactory`. This class allows us to create visualizations using sensible default parameters. After we have created a `VisualizationFactory`, we can use its method `createVisualization` to create the visualization itself. The method createVisualization(sequence, visualizationWidth, visualizationHeight, mapWidth, mapHeight) takes four arguments, which should be self-explanatory. The first argument is the sequence we want to visualize. The next two arguments decide the size in pixels of our resulting visualization. The last two arguments decide the size of mini map that will be created as a part of the visualization. If we don't want the mini map, we can set its sizes to 0 and it won't be created. The method returns an element that contains the resulting image. Let's modify the callback to create a visualization and add it to the document.

```javascript
function load() {
    if (dataFileInput.files.length == 0) {
        console.log("No file selected!");
        return;
    }
    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        let factory = new Mocap.VisualizationFactory();
        let visualizationElement = factory.createVisualization(sequences[0], 850, 250, 250, 250);
        document.body.appendChild(visualizationElement);
    });
}
```

When we click the load button now, it will create a visualization of the first sequence contained in our data file.

*When we load a sequence using one of the two loading functions, the sequences aren't actually processed yet, because that would be very slow for large data files. The sequence is actually parsed only when we actually create a visualization. This means that we can load large data files without worries. Be careful about loading data files that are too big though, as this will take up a lot of RAM and might slow down the browser.*

## Modifying the Visualization

`VisualizationFactory` provides many parameters that can change the look of the resulting visualization. One common parameter we might want to modify is the amount of keyframes drawn. We can do this using the parameter `numKeyframes`. If we wanted to change the amount of keyframes for the zoomed in visualization available on click, we can do that with `numZoomedKeyframes`. The keyframe selection algorithm can be changed with `keyframeSelectionAlgorithm`. If for some reason we wanted the left bones in the visualization to be green instead of red, we could do it by changing `leftBoneStyle`. When changing these style parameters, remember they should be set to objects that contain the color looking like this `{r: <0-255>, g: <0-255>, b: <0-255>, a: <0-1>}`. That is three integers in the range 0 to 255 containing the color components and one float in the range 0 to 1 which contains the alpha. The alpha isn't actually used for the WebGL rendering, but to be sure set it too. To actually change the opacity of drawn frames we would use the parameter `opacity` and `blurFrameOpacity`. Let's show off changing all these parameters:

```javascript
Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
    let factory = new Mocap.VisualizationFactory();
    factory.numKeyframes = 8;
    factory.numZoomedKeyframes = 10;
    factory.keyframeSelectionAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum.Equidistant;
    factory.leftBoneStyle = {r: 0, g: 180, b: 0, a: 1};
    factory.opacity = 0.6;
    factory.blurFrameOpacity = 0.17;
    let visualizationElement = factory.createVisualization(sequences[0], 850, 250, 250, 250);
    document.body.appendChild(visualizationElement);
});
```

To see all the available parameters for `VisualizationFactory` see [this part](DOCUMENTATION.md#all-available-parameters) of the documentation.

The full resulting code:

```html
<html>
    <head>
        <meta charset="utf-8" />
        <title>
            MocapViz Test
        </title>     
    </head>
    <body>
        <button id="dataLoadButton">Load Data</button>
        <input type="file" id="dataFileInput" name="dataFileInput" accept=".data,.txt">
            
        <script type="module">
            import * as Mocap from './mocap.min.js';

            const dataFileInput = document.getElementById("dataFileInput");
            const loadButton = document.getElementById("dataLoadButton");
            loadButton.onclick = load;

            function load() {
                if (dataFileInput.files.length == 0) {
                    console.log("No file selected!");
                    return;
                }
                Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
                    let factory = new Mocap.VisualizationFactory();
                    factory.numKeyframes = 8;
                    factory.numZoomedKeyframes = 10;
                    factory.keyframeSelectionAlgorithm = Mocap.KeyframeSelectionAlgorithmEnum.Equidistant;
                    factory.leftBoneStyle = {r: 0, g: 180, b: 0, a: 1};
                    factory.opacity = 0.6;
                    factory.blurFrameOpacity = 0.17;
                    let visualizationElement = factory.createVisualization(sequences[0], 850, 250, 250, 250);
                    document.body.appendChild(visualizationElement);
                });
            }
        </script>  
    </body>
</html>
```

## Full Scripting Documentation

For more information refer to the documentation. The full scripting API is available [here](DOCUMENTATION.md).