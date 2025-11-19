import { LegalTerm } from './types';

/**
 * Comprehensive legal dictionary for UK Supreme Court judgments
 * Categories: latin, procedural, constitutional, tort, contract, criminal, evidence, property
 */
export const mockLegalDictionary: LegalTerm[] = [
  // LATIN TERMS
  {
    term: 'obiter dicta',
    definition: 'Remarks of a judge which are not necessary to reaching a decision, but are made as comments or observations. Not binding as precedent.',
    category: 'latin',
  },
  {
    term: 'ratio decidendi',
    definition: 'The principle or reason for the decision in a case. This forms the binding precedent that must be followed in future similar cases.',
    category: 'latin',
  },
  {
    term: 'ultra vires',
    definition: 'Beyond one\'s legal power or authority. An act that requires legal authority but is done without it.',
    category: 'latin',
  },
  {
    term: 'res judicata',
    definition: 'A matter already judged; prevents re-litigation of a case that has been finally decided.',
    category: 'latin',
  },
  {
    term: 'stare decisis',
    definition: 'The legal principle of determining points in litigation according to precedent.',
    category: 'latin',
  },
  {
    term: 'prima facie',
    definition: 'At first sight; evidence that is sufficient to establish a fact unless it is rebutted.',
    category: 'latin',
  },
  {
    term: 'amicus curiae',
    definition: 'A friend of the court; someone who is not a party to a case but offers information to assist the court.',
    category: 'latin',
  },
  {
    term: 'habeas corpus',
    definition: 'A writ requiring a person under arrest to be brought before a judge to secure their release unless lawful grounds are shown.',
    category: 'latin',
  },
  {
    term: 'de facto',
    definition: 'In fact, whether by right or not. Describes something that exists in reality even if not legally recognized.',
    category: 'latin',
  },
  {
    term: 'de jure',
    definition: 'By law or by right. Describes something that is legally recognized.',
    category: 'latin',
  },
  {
    term: 'per se',
    definition: 'By itself, intrinsically. Used to describe something that is inherently true without need for additional proof.',
    category: 'latin',
  },
  {
    term: 'ex parte',
    definition: 'On behalf of one party only. A legal proceeding brought by one party without notice to another.',
    category: 'latin',
  },
  {
    term: 'inter alia',
    definition: 'Among other things. Used to indicate that there are other items or considerations not explicitly mentioned.',
    category: 'latin',
  },
  {
    term: 'mutatis mutandis',
    definition: 'With necessary changes. Used when comparing two situations that are similar but require minor modifications.',
    category: 'latin',
  },
  {
    term: 'in limine',
    definition: 'At the threshold. Refers to a motion made at the start of a trial requesting certain evidence be excluded.',
    category: 'latin',
  },
  {
    term: 'sub judice',
    definition: 'Under judicial consideration. A matter currently before a court and therefore not to be publicly discussed.',
    category: 'latin',
  },
  {
    term: 'obiter dictum',
    definition: 'A remark by the way. An observation made by a judge that is not essential to the decision.',
    category: 'latin',
  },

  // PROCEDURAL TERMS
  {
    term: 'appellant',
    definition: 'The party who appeals a lower court\'s decision to a higher court.',
    category: 'procedural',
  },
  {
    term: 'respondent',
    definition: 'The party against whom an appeal is brought.',
    category: 'procedural',
  },
  {
    term: 'claimant',
    definition: 'A person making a claim, especially in a lawsuit (formerly called plaintiff in UK civil cases).',
    category: 'procedural',
  },
  {
    term: 'defendant',
    definition: 'An individual, company, or institution sued or accused in a court of law.',
    category: 'procedural',
  },
  {
    term: 'jurisdiction',
    definition: 'The official power to make legal decisions and judgments, or the area in which this power exists.',
    category: 'procedural',
  },
  {
    term: 'injunction',
    definition: 'A court order requiring a party to do or refrain from doing a specific act.',
    category: 'procedural',
  },
  {
    term: 'standing',
    definition: 'The legal right to bring a lawsuit, requiring that a party has a sufficient connection to and harm from the action challenged.',
    category: 'procedural',
  },
  {
    term: 'certiorari',
    definition: 'A writ or order by which a higher court reviews a decision of a lower court.',
    category: 'procedural',
  },
  {
    term: 'estoppel',
    definition: 'A legal principle that prevents someone from asserting something contrary to what is implied by their previous actions or statements.',
    category: 'procedural',
  },
  {
    term: 'stay of proceedings',
    definition: 'A court order suspending a legal proceeding or judgment.',
    category: 'procedural',
  },
  {
    term: 'leave to appeal',
    definition: 'Permission granted by a court to appeal a decision to a higher court.',
    category: 'procedural',
  },
  {
    term: 'costs',
    definition: 'Legal expenses of litigation, which may be awarded to the successful party.',
    category: 'procedural',
  },
  {
    term: 'disclosure',
    definition: 'The process by which parties to litigation reveal documents relevant to the case to each other.',
    category: 'procedural',
  },
  {
    term: 'interlocutory',
    definition: 'Occurring during the course of legal proceedings, not final. An interlocutory judgment is provisional.',
    category: 'procedural',
  },
  {
    term: 'striking out',
    definition: 'A court\'s power to dismiss all or part of a claim or defense without a full trial.',
    category: 'procedural',
  },
  {
    term: 'summary judgment',
    definition: 'A judgment entered by a court without a full trial when there is no genuine dispute over the material facts.',
    category: 'procedural',
  },
  {
    term: 'vexatious litigant',
    definition: 'A person who persistently brings legal actions that lack merit, often requiring court permission for future claims.',
    category: 'procedural',
  },
  {
    term: 'pleadings',
    definition: 'The formal written statements submitted by parties in a lawsuit, setting out their case.',
    category: 'procedural',
  },

  // CONSTITUTIONAL & ADMINISTRATIVE LAW
  {
    term: 'judicial review',
    definition: 'A court process to challenge the lawfulness of a decision made by a public body.',
    category: 'constitutional',
  },
  {
    term: 'natural justice',
    definition: 'Fundamental rules of fair procedure, including the right to be heard and the right to an unbiased decision-maker.',
    category: 'constitutional',
  },
  {
    term: 'legitimate expectation',
    definition: 'A principle that a person may expect a public authority to act in a certain way if it has promised to do so or has established a regular practice.',
    category: 'constitutional',
  },
  {
    term: 'proportionality',
    definition: 'A legal test requiring that measures taken should not be more restrictive than necessary to achieve a legitimate aim.',
    category: 'constitutional',
  },
  {
    term: 'judicial deference',
    definition: 'The extent to which courts defer to the decisions of other branches of government or expert bodies.',
    category: 'constitutional',
  },
  {
    term: 'misfeasance',
    definition: 'The improper or unlawful performance of a lawful act.',
    category: 'constitutional',
  },
  {
    term: 'malfeasance',
    definition: 'Wrongdoing or misconduct, especially by a public official.',
    category: 'constitutional',
  },
  {
    term: 'parliamentary sovereignty',
    definition: 'The principle that Parliament has supreme legal authority and can create or end any law.',
    category: 'constitutional',
  },
  {
    term: 'separation of powers',
    definition: 'The division of governmental powers among the legislative, executive, and judicial branches.',
    category: 'constitutional',
  },
  {
    term: 'rule of law',
    definition: 'The principle that all persons and institutions are subject to and accountable to law that is fairly applied and enforced.',
    category: 'constitutional',
  },
  {
    term: 'prerogative powers',
    definition: 'Powers historically exercised by the monarch, now largely exercised by government ministers.',
    category: 'constitutional',
  },
  {
    term: 'devolution',
    definition: 'The transfer of powers from central government to regional or local administration.',
    category: 'constitutional',
  },
  {
    term: 'human rights',
    definition: 'Fundamental rights and freedoms protected under the European Convention on Human Rights and UK law.',
    category: 'constitutional',
  },
  {
    term: 'statutory instrument',
    definition: 'A form of delegated legislation made under powers granted by an Act of Parliament.',
    category: 'constitutional',
  },
  {
    term: 'wednesbury unreasonableness',
    definition: 'A decision so unreasonable that no reasonable authority could have made it (from Associated Provincial Picture Houses v Wednesbury Corporation).',
    category: 'constitutional',
  },

  // TORT LAW
  {
    term: 'tort',
    definition: 'A civil wrong that causes harm or loss, resulting in legal liability for the person who commits the wrongful act.',
    category: 'tort',
  },
  {
    term: 'damages',
    definition: 'A sum of money claimed or awarded as compensation for a loss or injury.',
    category: 'tort',
  },
  {
    term: 'negligence',
    definition: 'Failure to take proper care, resulting in damage or injury to another.',
    category: 'tort',
  },
  {
    term: 'duty of care',
    definition: 'A legal obligation to avoid causing harm to others through one\'s actions or omissions.',
    category: 'tort',
  },
  {
    term: 'breach of duty',
    definition: 'Failure to meet the standard of care required by law, forming part of a negligence claim.',
    category: 'tort',
  },
  {
    term: 'causation',
    definition: 'The link between a defendant\'s actions and the harm suffered by the claimant.',
    category: 'tort',
  },
  {
    term: 'nuisance',
    definition: 'An unlawful interference with a person\'s use or enjoyment of land, or some right over it.',
    category: 'tort',
  },
  {
    term: 'trespass',
    definition: 'Unlawful interference with a person, property, or rights.',
    category: 'tort',
  },
  {
    term: 'vicarious liability',
    definition: 'Liability imposed on one person for the wrongful acts of another, typically an employer for an employee\'s actions.',
    category: 'tort',
  },
  {
    term: 'defamation',
    definition: 'The action of damaging the good reputation of someone through false statements.',
    category: 'tort',
  },
  {
    term: 'libel',
    definition: 'A published false statement that is damaging to a person\'s reputation.',
    category: 'tort',
  },
  {
    term: 'slander',
    definition: 'A false spoken statement that damages someone\'s reputation.',
    category: 'tort',
  },
  {
    term: 'remoteness',
    definition: 'A limitation on damages - harm must not be too remote from the defendant\'s wrongful act.',
    category: 'tort',
  },

  // CONTRACT LAW
  {
    term: 'consideration',
    definition: 'Something of value given by both parties to a contract that induces them to enter into the agreement.',
    category: 'contract',
  },
  {
    term: 'breach of contract',
    definition: 'Failure to perform a contractual obligation or performing it defectively.',
    category: 'contract',
  },
  {
    term: 'repudiation',
    definition: 'Refusal to perform a contractual obligation, potentially allowing the other party to terminate the contract.',
    category: 'contract',
  },
  {
    term: 'frustration',
    definition: 'When unforeseen circumstances make contractual performance impossible or radically different from what was contemplated.',
    category: 'contract',
  },
  {
    term: 'specific performance',
    definition: 'A court order requiring a party to perform their contractual obligations.',
    category: 'contract',
  },
  {
    term: 'quantum meruit',
    definition: 'A claim for the reasonable value of services rendered, literally "as much as is deserved".',
    category: 'contract',
  },
  {
    term: 'rescission',
    definition: 'The cancellation of a contract, restoring parties to their pre-contractual position.',
    category: 'contract',
  },
  {
    term: 'misrepresentation',
    definition: 'A false statement of fact that induces a party to enter into a contract.',
    category: 'contract',
  },
  {
    term: 'undue influence',
    definition: 'Improper pressure that prevents someone from exercising independent judgment in entering a contract.',
    category: 'contract',
  },

  // CRIMINAL LAW
  {
    term: 'mens rea',
    definition: 'The mental element of a crime; guilty mind or criminal intent.',
    category: 'criminal',
  },
  {
    term: 'actus reus',
    definition: 'The physical element of a crime; a guilty act.',
    category: 'criminal',
  },
  {
    term: 'acquittal',
    definition: 'A judgment that a person is not guilty of the crime charged.',
    category: 'criminal',
  },
  {
    term: 'conviction',
    definition: 'A formal declaration that someone is guilty of a criminal offense.',
    category: 'criminal',
  },
  {
    term: 'indictment',
    definition: 'A formal written accusation charging a person with a crime.',
    category: 'criminal',
  },
  {
    term: 'bail',
    definition: 'The temporary release of an accused person awaiting trial, sometimes on condition that a sum of money is lodged.',
    category: 'criminal',
  },
  {
    term: 'prosecution',
    definition: 'The institution and conducting of legal proceedings against someone in respect of a criminal charge.',
    category: 'criminal',
  },
  {
    term: 'sentence',
    definition: 'The punishment assigned to a defendant found guilty of a crime.',
    category: 'criminal',
  },

  // EVIDENCE
  {
    term: 'burden of proof',
    definition: 'The obligation to prove one\'s assertion or claim in court.',
    category: 'evidence',
  },
  {
    term: 'hearsay',
    definition: 'Evidence based on what someone has been told rather than what they witnessed themselves, generally inadmissible.',
    category: 'evidence',
  },
  {
    term: 'admissibility',
    definition: 'Whether evidence is allowed to be presented in court proceedings.',
    category: 'evidence',
  },
  {
    term: 'relevance',
    definition: 'Whether evidence has a tendency to make a fact more or less probable.',
    category: 'evidence',
  },
  {
    term: 'probative value',
    definition: 'The extent to which evidence proves or helps prove a fact in issue.',
    category: 'evidence',
  },
  {
    term: 'cross-examination',
    definition: 'The questioning of a witness by the opposing party to challenge their testimony.',
    category: 'evidence',
  },
  {
    term: 'privilege',
    definition: 'A right to refuse to disclose certain information in legal proceedings, such as legal professional privilege.',
    category: 'evidence',
  },

  // PROPERTY LAW
  {
    term: 'easement',
    definition: 'A right to cross or otherwise use someone else\'s land for a specified purpose.',
    category: 'property',
  },
  {
    term: 'covenant',
    definition: 'A promise or agreement in a deed imposing obligations on the use of land.',
    category: 'property',
  },
  {
    term: 'freehold',
    definition: 'Permanent and absolute tenure of land or property with freedom to dispose of it.',
    category: 'property',
  },
  {
    term: 'leasehold',
    definition: 'The right to possess and use property for a specified period under a lease.',
    category: 'property',
  },
  {
    term: 'adverse possession',
    definition: 'Acquisition of title to land through continuous occupation without the owner\'s permission for a statutory period.',
    category: 'property',
  },
  {
    term: 'proprietary estoppel',
    definition: 'A claim arising when someone relies on an assurance about land to their detriment.',
    category: 'property',
  },

  // GENERAL LEGAL CONCEPTS
  {
    term: 'statutory interpretation',
    definition: 'The process by which courts interpret and apply legislation.',
    category: 'constitutional',
  },
  {
    term: 'common law',
    definition: 'Law developed by judges through court decisions and precedent, rather than through legislative statutes.',
    category: 'constitutional',
  },
  {
    term: 'precedent',
    definition: 'A legal principle established in a previous case that is binding or persuasive for courts when deciding subsequent cases with similar issues or facts.',
    category: 'procedural',
  },
];
