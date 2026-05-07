export interface ChecklistTemplate {
  label: string;
  required: boolean;
}

export interface FormFieldTemplate {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "phone" | "select" | "textarea" | "checkbox" | "currency";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormTemplate {
  title: string;
  description?: string;
  fields: FormFieldTemplate[];
}

export interface StageTemplate {
  name: string;
  description: string;
  checklist: ChecklistTemplate[];
  forms: FormTemplate[];
}

export interface TransactionTemplate {
  type: string;
  stages: StageTemplate[];
}

export const TRANSACTION_TEMPLATES: Record<string, TransactionTemplate> = {
  BUYER: {
    type: "BUYER",
    stages: [
      {
        name: "Pre-Approval & Search",
        description: "Client financing pre-approval and property search setup",
        checklist: [
          { label: "Buyer consultation completed", required: true },
          { label: "Buyer representation agreement signed", required: true },
          { label: "Mortgage pre-approval obtained", required: true },
          { label: "Search criteria defined", required: false },
          { label: "Showings scheduled", required: false },
        ],
        forms: [
          {
            title: "Buyer Profile",
            description: "Client information and purchase criteria",
            fields: [
              { name: "buyerName", label: "Buyer Full Name", type: "text", required: true },
              { name: "buyerEmail", label: "Email", type: "email", required: true },
              { name: "buyerPhone", label: "Phone", type: "phone", required: true },
              { name: "preApprovalAmount", label: "Pre-Approval Amount", type: "currency" },
              { name: "lenderName", label: "Lender / Broker Name", type: "text" },
              { name: "lenderContact", label: "Lender Contact", type: "phone" },
              { name: "maxBudget", label: "Maximum Budget", type: "currency", required: true },
              { name: "preferredAreas", label: "Preferred Areas", type: "textarea" },
              { name: "propertyType", label: "Property Type", type: "select", options: ["Detached", "Semi-Detached", "Townhouse", "Condo", "Other"] },
              { name: "minBedrooms", label: "Minimum Bedrooms", type: "number" },
              { name: "minBathrooms", label: "Minimum Bathrooms", type: "number" },
            ],
          },
        ],
      },
      {
        name: "Offer Preparation",
        description: "Preparing and submitting the offer",
        checklist: [
          { label: "Comparable sales reviewed", required: false },
          { label: "Offer price determined", required: true },
          { label: "Conditions drafted", required: true },
          { label: "Deposit amount confirmed", required: true },
          { label: "Closing date proposed", required: true },
          { label: "Offer signed by buyer", required: true },
          { label: "Offer submitted to listing agent", required: true },
        ],
        forms: [
          {
            title: "Offer Details",
            fields: [
              { name: "offerPrice", label: "Offer Price", type: "currency", required: true },
              { name: "depositAmount", label: "Deposit Amount", type: "currency", required: true },
              { name: "closingDate", label: "Proposed Closing Date", type: "date", required: true },
              { name: "conditionExpiry", label: "Condition Expiry Date", type: "date" },
              { name: "irrevocableDate", label: "Irrevocable Date/Time", type: "text", required: true },
              { name: "chattelsIncluded", label: "Chattels Included", type: "textarea" },
              { name: "fixturesExcluded", label: "Fixtures Excluded", type: "textarea" },
              { name: "specialConditions", label: "Special Conditions", type: "textarea" },
            ],
          },
        ],
      },
      {
        name: "Negotiation",
        description: "Counter-offers and negotiation",
        checklist: [
          { label: "Counter-offer received/sent", required: false },
          { label: "Final terms agreed", required: true },
          { label: "Accepted offer signed by all parties", required: true },
          { label: "Deposit delivered within deadline", required: true },
        ],
        forms: [],
      },
      {
        name: "Conditions",
        description: "Fulfilling conditions (financing, inspection, etc.)",
        checklist: [
          { label: "Home inspection scheduled", required: false },
          { label: "Home inspection completed", required: false },
          { label: "Inspection issues negotiated (if any)", required: false },
          { label: "Financing condition fulfilled", required: true },
          { label: "Status certificate reviewed (condo)", required: false },
          { label: "Insurance arranged", required: false },
          { label: "All conditions waived/fulfilled", required: true },
          { label: "Notice of fulfillment signed and delivered", required: true },
        ],
        forms: [
          {
            title: "Condition Fulfillment",
            fields: [
              { name: "financingApproved", label: "Financing Approved", type: "checkbox" },
              { name: "financingApprovedDate", label: "Financing Approval Date", type: "date" },
              { name: "inspectionCompleted", label: "Inspection Completed", type: "checkbox" },
              { name: "inspectionDate", label: "Inspection Date", type: "date" },
              { name: "inspectorName", label: "Inspector Name", type: "text" },
              { name: "inspectionNotes", label: "Inspection Notes", type: "textarea" },
              { name: "conditionWaiverDate", label: "Condition Waiver Date", type: "date", required: true },
            ],
          },
        ],
      },
      {
        name: "Pre-Closing",
        description: "Preparing for closing day",
        checklist: [
          { label: "Lawyer retained and engaged", required: true },
          { label: "Title search completed by lawyer", required: true },
          { label: "Mortgage documents signed", required: true },
          { label: "Final walkthrough completed", required: true },
          { label: "Closing funds confirmed with lawyer", required: true },
          { label: "Land transfer tax calculated", required: true },
          { label: "Utility transfers arranged", required: false },
        ],
        forms: [
          {
            title: "Closing Preparation",
            fields: [
              { name: "lawyerName", label: "Lawyer Name", type: "text", required: true },
              { name: "lawyerFirm", label: "Law Firm", type: "text" },
              { name: "lawyerPhone", label: "Lawyer Phone", type: "phone" },
              { name: "lawyerEmail", label: "Lawyer Email", type: "email" },
              { name: "closingDate", label: "Confirmed Closing Date", type: "date", required: true },
              { name: "landTransferTax", label: "Land Transfer Tax", type: "currency" },
              { name: "firstTimeBuyerRebate", label: "First-Time Buyer Rebate", type: "checkbox" },
            ],
          },
        ],
      },
      {
        name: "Closing",
        description: "Transaction completion and key handover",
        checklist: [
          { label: "Funds transferred", required: true },
          { label: "Title registered", required: true },
          { label: "Keys received", required: true },
          { label: "Transaction reported to brokerage", required: true },
          { label: "SkySlope entry completed", required: true },
          { label: "Client follow-up scheduled", required: false },
        ],
        forms: [],
      },
    ],
  },

  SELLER: {
    type: "SELLER",
    stages: [
      {
        name: "Listing Preparation",
        description: "Preparing the property for sale",
        checklist: [
          { label: "Seller consultation completed", required: true },
          { label: "Listing agreement signed", required: true },
          { label: "CMA prepared and reviewed", required: true },
          { label: "List price determined", required: true },
          { label: "Property photos taken", required: true },
          { label: "Property measurements confirmed", required: false },
          { label: "Staging recommendations provided", required: false },
          { label: "MLS listing drafted", required: true },
        ],
        forms: [
          {
            title: "Listing Information",
            fields: [
              { name: "sellerName", label: "Seller Full Name", type: "text", required: true },
              { name: "sellerEmail", label: "Email", type: "email", required: true },
              { name: "sellerPhone", label: "Phone", type: "phone", required: true },
              { name: "propertyAddress", label: "Property Address", type: "text", required: true },
              { name: "listPrice", label: "List Price", type: "currency", required: true },
              { name: "propertyType", label: "Property Type", type: "select", options: ["Detached", "Semi-Detached", "Townhouse", "Condo", "Other"] },
              { name: "bedrooms", label: "Bedrooms", type: "number" },
              { name: "bathrooms", label: "Bathrooms", type: "number" },
              { name: "sqft", label: "Square Footage", type: "number" },
              { name: "parkingSpaces", label: "Parking Spaces", type: "number" },
              { name: "listingExpiry", label: "Listing Expiry Date", type: "date" },
            ],
          },
        ],
      },
      {
        name: "Active Listing",
        description: "Property on market, managing showings and feedback",
        checklist: [
          { label: "MLS listing live", required: true },
          { label: "Lockbox installed", required: false },
          { label: "Showing instructions set", required: true },
          { label: "Open house scheduled (if applicable)", required: false },
          { label: "Showing feedback tracked", required: false },
        ],
        forms: [],
      },
      {
        name: "Offer Review",
        description: "Reviewing and negotiating incoming offers",
        checklist: [
          { label: "Offer(s) received", required: true },
          { label: "Offer(s) reviewed with seller", required: true },
          { label: "Counter-offer sent (if applicable)", required: false },
          { label: "Offer accepted and signed", required: true },
          { label: "Buyer deposit confirmed", required: true },
          { label: "Listing status updated in MLS", required: true },
        ],
        forms: [
          {
            title: "Accepted Offer Details",
            fields: [
              { name: "salePrice", label: "Sale Price", type: "currency", required: true },
              { name: "buyerName", label: "Buyer Name", type: "text" },
              { name: "buyerAgent", label: "Buyer Agent", type: "text" },
              { name: "buyerBrokerage", label: "Buyer Brokerage", type: "text" },
              { name: "depositAmount", label: "Deposit Amount", type: "currency" },
              { name: "closingDate", label: "Closing Date", type: "date", required: true },
              { name: "conditionExpiry", label: "Condition Expiry", type: "date" },
              { name: "conditions", label: "Conditions Summary", type: "textarea" },
            ],
          },
        ],
      },
      {
        name: "Conditions Period",
        description: "Buyer fulfilling conditions",
        checklist: [
          { label: "Buyer inspection scheduled/completed", required: false },
          { label: "Buyer financing confirmed", required: false },
          { label: "All conditions waived/fulfilled", required: true },
          { label: "Deal firm — notice received", required: true },
        ],
        forms: [],
      },
      {
        name: "Pre-Closing",
        description: "Preparing for closing",
        checklist: [
          { label: "Lawyer retained and engaged", required: true },
          { label: "Mortgage discharge arranged (if applicable)", required: false },
          { label: "Property vacant / move-out scheduled", required: false },
          { label: "Final meter readings taken", required: false },
          { label: "Keys and access prepared for handover", required: true },
        ],
        forms: [
          {
            title: "Closing Preparation",
            fields: [
              { name: "lawyerName", label: "Lawyer Name", type: "text", required: true },
              { name: "lawyerFirm", label: "Law Firm", type: "text" },
              { name: "lawyerPhone", label: "Lawyer Phone", type: "phone" },
              { name: "lawyerEmail", label: "Lawyer Email", type: "email" },
              { name: "moveOutDate", label: "Move-Out Date", type: "date" },
            ],
          },
        ],
      },
      {
        name: "Closing",
        description: "Transaction completion",
        checklist: [
          { label: "Funds received", required: true },
          { label: "Title transferred", required: true },
          { label: "Keys handed over", required: true },
          { label: "Transaction reported to brokerage", required: true },
          { label: "SkySlope entry completed", required: true },
          { label: "Client follow-up scheduled", required: false },
        ],
        forms: [],
      },
    ],
  },

  LEASE: {
    type: "LEASE",
    stages: [
      {
        name: "Lease Setup",
        description: "Setting up the lease transaction",
        checklist: [
          { label: "Landlord or tenant consultation completed", required: true },
          { label: "Representation agreement signed", required: true },
          { label: "Rental criteria defined", required: true },
        ],
        forms: [
          {
            title: "Lease Details",
            fields: [
              { name: "landlordName", label: "Landlord Name", type: "text", required: true },
              { name: "tenantName", label: "Tenant Name", type: "text", required: true },
              { name: "tenantEmail", label: "Tenant Email", type: "email" },
              { name: "tenantPhone", label: "Tenant Phone", type: "phone" },
              { name: "propertyAddress", label: "Property Address", type: "text", required: true },
              { name: "monthlyRent", label: "Monthly Rent", type: "currency", required: true },
              { name: "leaseStartDate", label: "Lease Start Date", type: "date", required: true },
              { name: "leaseEndDate", label: "Lease End Date", type: "date" },
              { name: "leaseTerm", label: "Lease Term", type: "select", options: ["Month-to-Month", "6 Months", "1 Year", "2 Years"] },
              { name: "depositAmount", label: "Deposit (First & Last)", type: "currency" },
              { name: "parkingIncluded", label: "Parking Included", type: "checkbox" },
              { name: "utilitiesIncluded", label: "Utilities Included", type: "textarea", placeholder: "List included utilities" },
            ],
          },
        ],
      },
      {
        name: "Application & Screening",
        description: "Tenant application and screening process",
        checklist: [
          { label: "Rental application received", required: true },
          { label: "References checked", required: true },
          { label: "Credit check completed", required: false },
          { label: "Employment verification completed", required: false },
          { label: "Tenant approved", required: true },
        ],
        forms: [],
      },
      {
        name: "Lease Agreement",
        description: "Drafting and signing the lease",
        checklist: [
          { label: "Standard Ontario lease prepared", required: true },
          { label: "Schedule B addendum drafted (if needed)", required: false },
          { label: "Lease reviewed with parties", required: true },
          { label: "Lease signed by all parties", required: true },
          { label: "First and last month rent collected", required: true },
        ],
        forms: [],
      },
      {
        name: "Move-In",
        description: "Tenant move-in and key handover",
        checklist: [
          { label: "Property condition report completed", required: true },
          { label: "Keys handed over", required: true },
          { label: "Utility transfer confirmed", required: false },
          { label: "Transaction reported to brokerage", required: true },
          { label: "SkySlope entry completed", required: true },
        ],
        forms: [],
      },
    ],
  },

  ASSIGNMENT: {
    type: "ASSIGNMENT",
    stages: [
      {
        name: "Assignment Setup",
        description: "Initial assessment and agreement",
        checklist: [
          { label: "Original purchase agreement reviewed", required: true },
          { label: "Assignment clause confirmed", required: true },
          { label: "Builder consent requirements identified", required: true },
          { label: "Assignment listing agreement signed", required: true },
        ],
        forms: [
          {
            title: "Assignment Details",
            fields: [
              { name: "assignorName", label: "Assignor (Original Buyer) Name", type: "text", required: true },
              { name: "assignorEmail", label: "Assignor Email", type: "email" },
              { name: "assignorPhone", label: "Assignor Phone", type: "phone" },
              { name: "builderName", label: "Builder / Developer", type: "text", required: true },
              { name: "projectName", label: "Project / Building Name", type: "text" },
              { name: "unitNumber", label: "Unit Number", type: "text" },
              { name: "originalPurchasePrice", label: "Original Purchase Price", type: "currency", required: true },
              { name: "assignmentPrice", label: "Assignment Price", type: "currency", required: true },
              { name: "estimatedOccupancy", label: "Estimated Occupancy Date", type: "date" },
              { name: "depositsPaid", label: "Total Deposits Paid to Builder", type: "currency" },
              { name: "assignmentFee", label: "Builder Assignment Fee", type: "currency" },
            ],
          },
        ],
      },
      {
        name: "Marketing & Offers",
        description: "Finding an assignee and negotiating",
        checklist: [
          { label: "Assignment listed / marketed", required: true },
          { label: "Offers received and reviewed", required: true },
          { label: "Assignment agreement signed", required: true },
          { label: "Deposit secured from assignee", required: true },
        ],
        forms: [
          {
            title: "Assignee Details",
            fields: [
              { name: "assigneeName", label: "Assignee (New Buyer) Name", type: "text", required: true },
              { name: "assigneeEmail", label: "Assignee Email", type: "email" },
              { name: "assigneePhone", label: "Assignee Phone", type: "phone" },
              { name: "assigneeAgent", label: "Assignee Agent (if different)", type: "text" },
              { name: "assignmentSalePrice", label: "Assignment Sale Price", type: "currency", required: true },
              { name: "depositToAssignor", label: "Deposit to Assignor", type: "currency" },
            ],
          },
        ],
      },
      {
        name: "Builder Consent",
        description: "Obtaining builder/developer consent",
        checklist: [
          { label: "Builder consent application submitted", required: true },
          { label: "Builder consent fee paid", required: true },
          { label: "Builder consent received", required: true },
          { label: "Amended purchase agreement signed", required: true },
        ],
        forms: [],
      },
      {
        name: "Legal & Closing",
        description: "Legal review and transaction completion",
        checklist: [
          { label: "Both parties retained lawyers", required: true },
          { label: "Legal review of assignment docs", required: true },
          { label: "Tax implications discussed (HST, capital gains)", required: true },
          { label: "Assignment funds transferred", required: true },
          { label: "Transaction reported to brokerage", required: true },
          { label: "SkySlope entry completed", required: true },
        ],
        forms: [],
      },
    ],
  },
};

export function getTemplateForType(type: string): TransactionTemplate | undefined {
  return TRANSACTION_TEMPLATES[type];
}
