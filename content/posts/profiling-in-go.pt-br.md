+++
date = "2021-12-06"
title = "Profiling em Go"
slug = "profiling-em-go"
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

#### _"O verdadeiro problema é que os progamadores passam muito tempo se preocupando com eficiência nos lugares errados e em momentos errados; otimização prematura é a raiz de todo o mal na programação (ou pelo menos da maior parte)." - The Art of Computer Programming_

### Por que se importar?

_Profiling_ é uma técnica para analisar a utilização de recursos computacionais de uma 
aplicação, tais como CPU e memória. É bastante útil para identificar trechos de código com alto 
consumo de recursos e chamadas excessivas de funções. O objetivo do _profiling_ é encontrar 
pontos de otimização no nosso código, bem como oportunidades de melhoria de performance.

Quando falamos de otimização de código, uma das coisas mais importantes é saber
quando otimizar nossos programas. Devemos estar atentos aos impactos da otimização
do código em detrimento de legilibilidade e _design_. Na maioria das situações, é mais válido ter um 
código limpo e de _design_ flexível do que um código de alta performance e baixa manutenibilidade.
Não precisamos da melhor performance possível, apenas de performance o suficiente.

Além disso, na maior parte das vezes, o grande custo de recursos dos nossos programas é 
causado por algumas poucas seções do código. Portanto, vale mais a pena focar na otimização 
dessas pequenas seções de alto custo, em vez de gastar tempo pensando em como otimizar 
outras seções que terão pouco impacto sobre a performance geral do programa.


### Como funciona?
Podemos pensar no processo de _profiling_ e otimização de código em três etapas:

1. **Coleta de dados**: a ferramenta de _profiling_ coleta amostras do consumo de CPU e memória do 
programa em execução. Para fazer isso, podemos utilizar a própria ferramenta de testes (`go test`) 
ou o pacote `http/pprof` (nesse caso, um _endpoint_ é exposto no nosso servidor);

2. **Visualização de dados**: podemos visualizar as amostras coletadas tanto pelo terminal, quanto 
por uma interface web, ambos sendo acessíveis através do comando `go tool pprof`;

3. **Otimização do programa**: por fim, tomamos a decisão sobre como (e se) otimizar nosso programa. Em geral, 
temos duas maneiras de fazer isso: alterando as estruturas de dados utilizadas ou alterando o 
algoritmo utilizado;

### Exemplo: Profiling de memória

O programa abaixo ordena os números que estão salvos em um arquivo chamado `numbers.txt`.
Esse arquivo contém um milhão de números gerados aleatoriamente, entre zero e um milhão.
A função `SortNumbers()` abre o arquivo, e então utiliza um `Scanner`, do pacote `bufio`,
para ler uma linha por vez e adicionar o número lido ao _slice_ `numbers`.
Para simplificar o exemplo, vamos manter os números lidos como _strings_ e ignorar o tratamento
de erro (não faça isso em casa).



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

###### 1. Coletando dados
Para esse exemplo, vamos usar o `go test` para coletar amostras da utilização de memória do
nosso programa. Para isso, criamos o seguinte arquivo de teste de _benchmark_:

```go
package main

import "testing"

func BenchmarkSortNumbers(b *testing.B) {
	for i := 0 ; i < b.N; i++ {
		SortNumbers("./numbers.txt")
	}
}
```

Agora, executamos o seguinte comando:

```
➜ go test -bench SortNumbers -benchmem -memprofile mem.prof ./example/...
```

`-bench` aceita uma _regex_ com o nome do teste de benchmark a ser executado.

`-benchmem` printa informações adicionais sobre alocações de memória.

`-memprofile` indica que estamos executando um _profiling_ de memória e que os dados 
de amostras devem ser salvos no arquivo _mem.prof_.

Além de criar dois novos arquivos, _mem.prof_ e _example.test_ (binário do teste), a execução
do comando exibe a seguinte saída:


```
goos: linux
goarch: amd64
pkg: example
cpu: Intel(R) Core(TM) i7-7700HQ CPU @ 2.80GHz
...                 3         497555656 ns/op        96406397 B/op    1000040 allocs/op
PASS
ok      example  3.017s
```

###### 2. Visualizando dados

No _output_ acima, já podemos notar algumas informações relevantes como por exemplo o número
de alocações de memória realizadas pelo nosso programa (1000040). Isso já é o suficiente
para termos algumas intervenções consideráveis do _garbage collector_ durante a execução
do programa.

Agora, vamos utilizar a ferramenta `pprof` para visualizar e analisar com mais detalhes
as amostras coletadas. Para isso, executamos:

```
➜ go tool pprof mem.prof
```

`pprof` possui alguns subcomandos interessantes. Para ver a lista completa,
você pode usar o subcomando _help_ a qualquer momento. Vamos usar o comando _top5_
para visualizar as cinco chamadas de funções mais significativas.

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

Como temos apenas a função `SortNumbers()`, podemos ver que
os 558.16MB estão sendo alocados por parte dessa função. Agora, vamos
usar o subcomando _list_ para ver mais detalhes da nossa função.

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

Podemos ver que a alocação de memória ocorre na linha 26. Por estarmos usando
um _slice_ de tamanho indefinido, a cada poucas iterações mais memória precisa
ser alocada. (Utilizando o comando `list Text()` conseguimos identificar também que 
apenas cerca de 25MB são alocados na chamada ao `scanner.Text()`).


###### 3. Otimizando o programa

Para otimizar nosso programa, vamos usar a estratégia de _substituir o algoritmo_.
Nesse caso, vamos substituir a implementação da função `SortNumbers()` pela seguinte:

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

Nessa implementação, estamos lendo todas as linhas do arquivo de uma vez só.
Também estamos delegando a alocação de `numbers` para a chamada do
`strings.Split()`. Internamente, esse método faz a alocação de um _slice_
com tamanho fixo. Portanto, podemos esperar resultados melhores.

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

Usando novamente o comando `go test` para executar os testes de _benchmark_,
vemos que conseguimos reduzir o número de alocaçãoes de memória para apenas 8. Ótimo!

Agora, vamos analisar novamente os resultados usando o `go tool pprof`


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

163.87MB de alocação total de memória (comparado com 558.16MB da primeira implementação). 
Ótimo, novamente!
Temos uma alocação de 32.85MB do _buffer_ `bs`, que possui todo o conteúdo do 
arquivo `numbers.txt`. E temos uma segunda alocação de 131.02MB, para dividir o 
conteúdo do arquivo em um slice de _strings_. Nada mal.

### O que mais?

Do mesmo jeito que fizemos o _profiling_ de memória no exemplo acima, podemos
seguir a mesma abordagem para fazer um _profiling_ de CPU, a fim de identificar 
funções que levam mais tempo para serem executadas, ou funções que estão sendo 
executadas em excesso. Para isso, basta usarmos o comando `go test` com a
flag `-cpuprofile`.


```
➜ go test -bench SortNumbers -cpuprofile cpu.prof ./example/...
```

Por fim, vale lembrar que existem outras formas de realizar _profiling_ em
Go. Como mencionado no início do texto, podemos usar o pacote `http/pprof`. Além
disso, temos ferramentas próprias para cada sistema operacional, como por exemplo
[perf](https://perf.wiki.kernel.org/index.php/Tutorial) no Linux e [Instruments](https://help.apple.com/instruments/mac/current/#/dev7b09c84f5) no macOS. Você pode encontrar mais informações na própria documentação original
de [diagnostics](https://go.dev/doc/diagnostics) da linguagem.
