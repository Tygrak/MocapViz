import {terser} from 'rollup-plugin-terser';


function header() {

	return {

		renderChunk( code ) {

			return `/**
 * @license
 * Copyright (c) 2021 Tygrak
 * SPDX-License-Identifier: MIT
 */
${ code }`;

		}

	};

}

export default [
	{
		input: 'src/mocap.js',
		output: [
			      { 
                file: 'build/mocap.module.js', 
                format: 'es',
                plugins: [header()]
            },
            {
              file: 'build/mocap.min.js',
              format: 'es',
              plugins: [terser(), header()]
            },
            { 
              file: 'build/mocap.js', 
              format: 'iife',
              name: 'Mocap',
              plugins: [header()]
            }
		]
	}
  //uncomment following to build canvas2d version
  /*,
  {
		input: 'src/mocapCanvas2d.js',
		output: [
			      { 
                file: 'build/mocapCanvas2d.module.js', 
                format: 'es',
                plugins: [header()]
            },
            {
              file: 'build/mocapCanvas2d.min.js',
              format: 'es',
              plugins: [terser(), header()]
            },
            { 
              file: 'build/mocapCanvas2d.js', 
              format: 'iife',
              name: 'Mocap',
              plugins: [header()]
            }
		]
	}*/
];