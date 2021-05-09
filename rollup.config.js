import {terser} from 'rollup-plugin-terser';

export default [
	{
		input: 'src/mocap.js',
		output: [
			{ 
                file: 'build/mocap.module.js', 
                format: 'es' 
            },
            {
              file: 'build/mocap.min.js',
              format: 'es',
              plugins: [terser()]
            }
		]
	}
];