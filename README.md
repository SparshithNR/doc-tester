
Markdown file tester
# this is a sample file to test feature.
## POC file

```js
import { add } from './add';
add(4, 5) // equals: 9;
add(4, 5) // not-equals: 6;
add(2, 3) // throws;
```
```js
import {
  subtract
} from './add';
const numbers = {
  a: 4,
  b: 3
};
subtract(numbers.a, numbers.b) // equals: 1;
add( {
  a: 4
}.a, 4) // equals: 8;