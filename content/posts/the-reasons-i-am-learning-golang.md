+++
date = "2021-03-10"
title = "The Reasons I am Learning Golang"
slug = "the-reasons-i-am-learning-golang"
tags = [
    "go",
    "golang",
    "learning",
]
categories = [
    "programming languages",
    "golang",
]
+++

#### _Simplicity is the ultimate sophistication. - Leonardo da Vinci_

So it's been more than a year since I started to write my first lines of Go code.
It was the end of 2019, I heard rumors about some "Go programming language"
that was hyped, that was backed by Google and that was different from every other
programming language. 

When you're learning to program and you here things like the ones above, you get excited:
"yeey a new tool to learn!" - or at least panicked: "ooh, no! another tool to learn."
But as you gain more years of experience, your reaction becomes closer to
"oh no, another couple of people reinventing the wheel". The latter was my reaction, so
I decided to google "Golang" to confirm my preconceptions, but something happened.

At that time, I was a software architect. I was building software with Typescript
and NodeJS for years and I was demotivated by the manner that the language was
being used: complex syntax, missing good package encapsulation (as an architect,
that's important) and design constraints imposed by single-thread and event loop.

**DISCLAIMER**: Hey you! Before you continue, I don't want you to think that I 
am arguing that Go is better than Typescript/NodeJS. 
That's not the point. Please, pay attention to what I wrote: I was
demotivated by **the manner people use the tools**, and Golang seems
to solve all the problems that I wrote in the last paragraph.
That said, let me detail the reasons that made me put some eggs in
Golang's basket.


#### #1 Twenty-Five Keywords Are Enough
_const, var, func, type, import, package, chan, interface, map, struct, break,
case, continue, default, else, falthrough, for, goto, if, range, return, select,
switch, defer, go_. 

That's it, you just learned all keywords in Golang. But why
is that important anyway?  Well, after reading hundreds of code bases and 
thousands of lines of code, you start to realize how complicated things become 
when you just want to adjust a feature or fix a bug in your project, and the file you're editing 
has four different _for loop_ implementations, or three different ways to write a condition.

> Should I use an "if" here? Should I use a ternary operator? "dogs.forEach..." oh, wait!
that's slower than "for of". 

You see?  My point here is about flexibility. It's nice to have options to shorten your
implementation process. But at the end of the day it becomes chaotic. Your
code base becomes a baroque poetry written by drunk people. The task
that you had to solve becomes a bit more complex because programmers decided
to make abstract art.


#### #2 Packaging At The Right Level
When we want our software to have a long life, one of the most important
concerns is design. In special, we constantly need to keep looking for improvents on 
maintainability and reusability. Reason #1 talked about maintainability, 
so let's focus on reusability now.

How hard it is to create a component in the programming language that you use? 
How hard it is to import a component developed by another programmer in your 
company? I imagine the other programmer divided the component into many files, 
but he/she doesn't want clients to be able to import any file they want from 
his/her component. Does your programming language support that?

> Does your programming language provide syntax and tools for representing
components?

If you're developing a web application in Go, you can clearly define
the boundaries of your app. Want to design something based on hexagonal/clean
architecture? No problem, you can assign a file to a package just by adding
`package <name>` as the first line of the file and putting it into a folder
with the same name.

Go let's you define boundaries between files from one package and files
from a second package. In practice, if two files belong to package A they
will act as if they were a single file, it is, you can share functions and
data types between the two files.

On the other hand, clients of package A don't need to be concerned about how many 
files package A really has. If some file in package B needs to use package A, 
all you have to do is `import A` at the beginning of B's file. 
In summary, clients depend on packages instead of individual files. Encapsulation.

#### #3 The Beauty of Concurrency
Concurrency and parallelism. That's a topic very debated in computer science.
One of the hardest problems to solve. Great attempts were made to solve it, with 
Communicating Sequential Processes (CSP) being one of those attempts.

CSP has its roots in math. It's conceptualized as a formal language in that 
communication happens with message passing via channels. Using the math terms,
_we have processes that communicate data as events_. Processes are intended
to be designed as elements that can act independently. Thus CSP is about concurrency,
but not about parallelism.

Golang uses CSP as its concurrency model:
we have goroutines and whenever we want to emit an event to another goroutine, 
we send the data through a channel. **We share data by communicating, we don't
communicate by sharing data**, it is, we don't need to share a variable's
memory address between threads and handle race conditions, because we are not
interested in memory addresses but in the value they hold.

The fact that Golang was designed with concurrency in mind instead of parallelism
is awesome. It gives programmers an enourmous power for designing great software.
I don't want to risk myself trying to explain concurrency vs paralleism here,
that would take a new and long blog post. Besides that, a very qualified person
has already done it: [Concurrency is not Parallelism by Rob Pike](https://www.youtube.com/watch?v=oV9rvDllKEg).
