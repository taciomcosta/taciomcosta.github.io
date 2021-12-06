+++
date = "2021-12-06"
title = "Profiling in Go"
slug = "profiling-in-go"
tags = [
    "go",
    "golang",
    "performance",
    "profiling",
]
categories = [
    "golang",
    "performance",
]
+++

#### _"The real problem is that programmers have spent far too much time worrying about efficiency in the wrong places and at the wrong times; premature optimization is the root of all evil (or at least most of it) in programming." - The Art of Computer Programming_

### Why bother?

_Profiling_ is a technique to analyze the utilization of computational resources of applications,
such as CPU and memory. It's very useful to spot snippets of code with a high consumption
of resources and excessive function calls. The goal with profiling is to find sections of
code that can be optmized, and opportunities of improving code performance as well.

When we talk about code optimization, one of the most important things is to know when
to optimize our programs. We should be aware of code optimization impacts at the expense of
code readability and design. In most situations, it's more valuable to have clean code with
a flexible design instead of a high performance code with low maintainability. We don't need
code with the best performance, we just need code with enough performance.

Moreover, most of the time, the biggest part of costs come from some fewer sections of our code.
With that, it's wise to focus on optimizing those fewer sections of code instead of spending
time trying to find ways of optimizing sections of code that will have lower or no impact in
the overall program performance.

### How does it work?
We can think about the process of profiling and code optimization in three steps:

1. **Collecting data**: the profiling tool collects samples of CPU and memory
from the running program. To do that, we can use the testing tool (`go test`) or the `http/pprof` package
(in this case, an endpoint is exposed in our server);

2. **Visualizing data**: we can visualize the collected samples both in the terminal
and in web interface, we can do that using the `go tool pprof` command;

3. **Optimizing the program**: at last, we decide how to optimize our program (and if we should 
optimize it at all). In general, we have two ways of doing that: we can change the data structures
or we can change the algorithm;

### Example: Memory profiling 

The program below sorts the numbers from a file named `numbers.txt`.
This file has one million numbers generated randomly, between zero and one million.
The function `SortNumbers()` opens the file, then uses a `Scanner`, from the `bufio` package,
to read one line at a time and add the number read to the `numbers` slice.
To simplify the example, let's keep the numbers read as strings and ignore the error handling
(do not do that at home).

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
)

func main() {
	numbers := SortNumbers("./numbers.txt")
	fmt.Println(numbers)
}

func SortNumbers(filepath string) []string {
	var numbers []string

	f, _ := os.Open(filepath)

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		numbers = append(numbers, scanner.Text())
	}

	sort.Strings(numbers)

	return numbers
}
```

###### 1. Collecting data
For this example, we are going to use `go test` to collect samples of memory usage.
To do that, we create the following benchmark testing file:

```go
package main

import "testing"

func BenchmarkSortNumbers(b *testing.B) {
	for i := 0 ; i < b.N; i++ {
		SortNumbers("./numbers.txt")
	}
}
```

Now we run the following command:

```
➜ go test -bench SortNumbers -benchmem -memprofile mem.prof ./example/...
```

`-bench` accepts a _regex pattern_ with the name of the benchmark test to be run.

`-benchmem` prints additional information about memory allocations.

`-memprofile` indicates that we are running a memory profiling and that the sample data
should be saved to the _mem.prof_ file.

In addition to generating two new files, _mem.prof_ and _example.test_ (test binary), the command
execution shows us the following output:

```
goos: linux
goarch: amd64
pkg: example
cpu: Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz
...                 3         497555656 ns/op        96406397 B/op    1000040 allocs/op
PASS
ok      example  3.017s
```

###### 2. Visualizing data

In the output above, we can already notice some relevant information such as the total of
memory allocations made by our program (1000040). That is sufficient enough to have some
considerable preemptions of the _garbage collector_ during the program execution.

Now, let's use the `pprof` tool to visualize and analyze the samples with more detail.
To do that, we run:

```
➜ go tool pprof mem.prof
```

`pprof` has some interesting subcommands. To see the full list, you can
use the _help_ subcommand at any time. Let's use the _top5_ subcommand
to visualize the five most significant function calls.

```
(pprof) top5
Showing nodes accounting for 558.16MB, 100% of 558.16MB total
Showing top 5 nodes out of 6
      flat  flat%   sum%        cum   cum%
  504.66MB 90.41% 90.41%   558.16MB   100%  example.SortNumbers
   53.50MB  9.59%   100%    53.50MB  9.59%  bufio.(*Scanner).Text (inline)
         0     0%   100%   558.16MB   100%  example.BenchmarkSortNumbers
         0     0%   100%   469.17MB 84.06%  testing.(*B).launch
         0     0%   100%    88.99MB 15.94%  testing.(*B).run1.func1
```

As we have only the `SortNumbers()` function, we can see that
the 558.16MB are being allocated within that. Now, let's use the 
_list_ subcommand to see more details of that function.

```
(pprof) list SortNumbers
Total: 558.16MB
ROUTINE ======================== profiling-poc/example.SortNumbers
  504.66MB   558.16MB (flat, cum)   100% of Total
         .          .     21:
         .          .     22:   f, _ := os.Open(filepath)
         .          .     23:
         .          .     24:   scanner := bufio.NewScanner(f)
         .          .     25:   for scanner.Scan() {
  504.66MB   558.16MB     26:           numbers = append(numbers, scanner.Text())
         .          .     27:   }
         .          .     28:
         .          .     29:   sort.Strings(numbers)
         .          .     30:
         .          .     31:   return numbers
(pprof) 
```

We can see that the memory allocation happens on line 26. As we are using a
slice of variable length, in a few iterations more and more memory needs to be allocated.
(Using the command `list Text()` we could also identify that only something around 25MB
were being allocated during the `scanner.Text()` calls).

###### 3. Optimizing the program

To optimize our program, we're going to be using the _replace algorithm_ strategy.
In this case, we are going to replace the implementation of `SortNumbers()` function
by the following one:

```go
func SortNumbers(filepath string) []string {
	var numbers []string

	bs, err := os.ReadFile(filepath)
	if err != nil {
		return numbers
	}
	numbers = strings.Split(string(bs), "\n")

	sort.Strings(numbers)

	return numbers
}
```

In this implementation, we are reading all lines from `numbers.txt` at once.
We are also delegating the allocation of `numbers` to the `strings.Split()` call.
Internally, this method allocates a fixed-size slice. Therefore, we can hope for
better results this time.

```
➜ go test -bench SortNumbers -benchmem -memprofile mem.prof ./example/...
goos: linux
goarch: amd64
pkg: example
cpu: Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz
...                 3         495895932 ns/op        29786464 B/op          8 allocs/op
PASS
ok      profiling-poc/example  2.978s
```

Using the `go test` command to execute the benchmark tests once again,
we see that we reduced the total number of memory allocations to only 8. Great!

Now let's analyze the result of `go tool pprof` one more time.

```
(pprof) list SortNumbers 
Total: 163.87MB
ROUTINE ======================== example.SortNumbers
   39.42MB   163.87MB (flat, cum)   100% of Total
         .          .     31:   //return numbers
         .          .     32://}
         .          .     33:
         .          .     34:func SortNumbers(filepath string) []string {
         .          .     35:   var books []string
         .    32.85MB     36:   bs, err := os.ReadFile(filepath)
         .          .     37:   if err != nil {
         .          .     38:           return books
         .          .     39:   }
   39.42MB   131.02MB     40:   books = strings.Split(string(bs), "\n")
         .          .     41:   sort.Strings(books)
         .          .     42:   return books
         .          .     43:}
         .          .     44:
         .          .     45:func generateFile(filepath string, n int) {


```

163.87MB of memory allocation (compared to 558.16MB of the first implementation).
Again, great!
We have an allocation of 32.85MB of `bs` buffer, which holds all the content of
`numbers.txt` file. We also have a second allocation of 131.02MB, used to split
the file content into a slice of strings. Not bad.

### What's more?

In the same way that we profilled the memory usage, we can use the same approch 
to profile the CPU usage, with the goal of finding functions that take more time
to be executed, or functions that are being executed excessively. To do that, we
just have to run the `go test` command using the `-cpuprofile` flag.


```
➜ go test -bench SortNumbers -cpuprofile cpu.prof ./example/...
```

At last, it's worth remembering that there are other ways of profiling in Go.
As mentioned in the begining of this post, we can use the `http/pprof` package.
Besides that, we have specific tools for each operating system, we have [perf](https://perf.wiki.kernel.org/index.php/Tutorial) 
on Linux and [Instruments](https://help.apple.com/instruments/mac/current/#/dev7b09c84f5) on macOS.
You can learn more about them reading the [diagnostics](https://go.dev/doc/diagnostics)
language documentation.

