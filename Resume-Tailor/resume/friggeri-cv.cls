\ProvidesClass{friggeri-cv}[2012/04/30 CV class]
\NeedsTeXFormat{LaTeX2e}

\DeclareOption{print}{\def\@cv@print{}}
\DeclareOption*{%
  \PassOptionsToClass{\CurrentOption}{article}%
}

\def\@@ptsize{10pt}
\DeclareOption{10pt}{\def\@@ptsize{10pt}}
\DeclareOption{11pt}{\def\@@ptsize{11pt}}
\DeclareOption{12pt}{\def\@@ptsize{12pt}}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{report}}

\ProcessOptions\relax
\LoadClass[\@@ptsize]{article}


%%%%%%%%%%
% Colors %
%%%%%%%%%%

\RequirePackage{xcolor}

\definecolor{white}{RGB}{255,255,255}

\definecolor{darkgray}{HTML}{333333}
\definecolor{gray}{HTML}{444444}
\definecolor{lightgray}{HTML}{777777}
\definecolor{lightergray}{HTML}{EEEEEE}

\definecolor{green}{HTML}{C2E15F} %C2E15F
\definecolor{orange}{HTML}{FDA333} %FDA333
\definecolor{purple}{HTML}{A33FF3} %D3A4F9
\definecolor{red}{HTML}{FB4485} %FB4485
\definecolor{blue}{HTML}{0874bd} %6CE0F1

\ifdefined\@cv@print
  \colorlet{green}{gray}
  \colorlet{orange}{gray}
  \colorlet{purple}{gray}
  \colorlet{brown}{gray}
  \colorlet{red}{gray}
  \colorlet{blue}{gray}
  \colorlet{fillheader}{lightergray}
  \colorlet{header}{gray}
\else
  \colorlet{fillheader}{lightergray}
  \colorlet{header}{gray}
\fi
\colorlet{textcolor}{gray}
\colorlet{headercolor}{gray}

%%%%%%%%%
% Fonts %
%%%%%%%%%

\RequirePackage[quiet]{fontspec}
\RequirePackage[math-style=TeX]{unicode-math}
\RequirePackage{setspace}

\newfontfamily\bodyfont[]{Open Sans}
\newfontfamily\thinfont[]{Open Sans Light}
\newfontfamily\headingfont[]{Open Sans Bold}

\defaultfontfeatures{Mapping=tex-text}
\setmathfont{latinmodern-math.otf}
\setmainfont[Mapping=tex-text, Color=textcolor]{Open Sans Light}

\renewcommand{\baselinestretch}{1.2} 

%%%%%%%%%%
% Header %
%%%%%%%%%%

\RequirePackage{tikz}
% Control the URL boxes
\usepackage{hyperref}
\hypersetup{
    colorlinks=true,
    urlcolor=black
}

\newcommand{\rolefont}{%
  \fontsize{14pt}{24pt}\selectfont%
  \thinfont%
  \color{white}%
}

\newcommand{\header}[3]{%
  \begin{tikzpicture}[remember picture,overlay]
    \node [rectangle, fill=fillheader, anchor=north, minimum width=\paperwidth, minimum height=2.8cm] (box) at (current page.north){};
    \node [anchor=center] (name) at (box) {%
      \fontsize{32pt}{48pt}\color{header}%
      {\thinfont #1}{\bodyfont  #2}
    };
    \node [anchor=north] at (name.south) {%
      \fontsize{10pt}{24pt}\color{header}%
      \thinfont #3%
    };
  \end{tikzpicture}
  \vspace{1cm}
}


%%%%%%%%%%%%%
% Structure %
%%%%%%%%%%%%%
\RequirePackage{parskip}
\RequirePackage{enumitem}

\newcounter{colorCounter}
\def\@sectioncolor#1{%
  {%
    \color{%
      \ifcase\value{colorCounter}%
        blue\or%
        red\or%
        orange\or%
        green\or%
        purple\or%
        brown\else%
        headercolor\fi%
    } #1%
  }%
  %\stepcounter{colorCounter}%
}

\renewcommand{\section}[1]{
  \par\vspace{0.5\parskip}
  {%
    \LARGE\headingfont\color{headercolor}%
    \@sectioncolor {#1}
  }
  \par\vspace{0.5\parskip}
}

\renewcommand{\subsection}[1]{
  \par\vspace{0.25\parskip}%
  {%
  \Large\headingfont\color{headercolor} #1%
  }
  \par\vspace{0.25\parskip}%
}

\pagestyle{empty}


%%%%%%%%%%%%%%%%%%%%
% List environment %
%%%%%%%%%%%%%%%%%%%%
\usepackage[none]{hyphenat} % cancels hyphenat

\setlength{\tabcolsep}{0pt}
\newenvironment{entrylist}{%
  \begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}ll}
}{%
  \end{tabular*}
}
\renewcommand{\bfseries}{\headingfont\color{headercolor}}
\newcommand{\entry}[4]{%
  #1&\parbox[t][][t]{15cm}{%  
    \textbf{#2}%
    \hfill%
    {\footnotesize\addfontfeature{Color=lightgray} #3}\\%
    #4\vspace{\parsep}%
  }\\}
\newcommand{\entryInline}[4]{%
  #1&\parbox[t]{15.0cm}{%
    \textbf{#2} \ \ {\footnotesize\addfontfeature{Color=lightgray} #4}%
    \hfill%
    {\footnotesize\addfontfeature{Color=lightgray} #3}%
  } \vspace{0mm}}
\newcommand{\entryInlineSmall}[4]{%
  #1&\parbox[t]{15.0cm}{%
    \textbf{#2} %
    \hfill%
    {\footnotesize\addfontfeature{Color=lightgray} #3}%
  } \vspace{0mm}}
\newcommand{\entrysmall}[4]{%
  #1&\parbox[t]{15.0cm}{%
    \textbf{#2}%
    \hfill%
    {\footnotesize\addfontfeature{Color=lightgray} #3}%
  }\\}
  

%%%%%%%%%%%%%%%%
% Other tweaks %
%%%%%%%%%%%%%%%%

\RequirePackage[left=1.5cm,top=1.5cm,right=1.5cm,bottom=1.5cm,nohead,footskip=20pt]{geometry}
\RequirePackage{hyperref}

%%%%%%%%%%
% Summary %
%%%%%%%%%%

% Add this section to the class file (friggeri-cv.cls)
\newcommand{\summary}[1]{%
  \section{Summary}
  #1
  \par\vspace{0.3cm}
}

%%%%%%%%%%%%%%%%
% Skill Section %
%%%%%%%%%%%%%%%%

\setlength{\tabcolsep}{0pt}
\newenvironment{skillslist}{%
  \begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}l}
}{%
  \end{tabular*}
}
\newcommand{\skill}[2]{%
  \parbox[t]{18.0cm}{%  
    \textbf{#1}: #2%
    \vspace{0mm}%
  }\\
}