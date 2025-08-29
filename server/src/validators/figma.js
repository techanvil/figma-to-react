const Joi = require("joi");

// Figma node schema
const figmaNodeSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string().required(),
  visible: Joi.boolean().default(true),
  locked: Joi.boolean().default(false),
  children: Joi.array().items(Joi.link("#figmaNode")).optional(),
  absoluteBoundingBox: Joi.object({
    x: Joi.number(),
    y: Joi.number(),
    width: Joi.number(),
    height: Joi.number(),
  }).optional(),
  constraints: Joi.object({
    vertical: Joi.string(),
    horizontal: Joi.string(),
  }).optional(),
  fills: Joi.array()
    .items(
      Joi.object({
        type: Joi.string(),
        color: Joi.object({
          r: Joi.number(),
          g: Joi.number(),
          b: Joi.number(),
          a: Joi.number().default(1),
        }).optional(),
        gradientStops: Joi.array().optional(),
      })
    )
    .optional(),
  strokes: Joi.array().optional(),
  strokeWeight: Joi.number().optional(),
  cornerRadius: Joi.number().optional(),
  effects: Joi.array().optional(),
  characters: Joi.string().optional(), // For text nodes
  style: Joi.object({
    fontFamily: Joi.string(),
    fontSize: Joi.number(),
    fontWeight: Joi.number(),
    lineHeightPx: Joi.number(),
    letterSpacing: Joi.number(),
    textAlignHorizontal: Joi.string(),
    textAlignVertical: Joi.string(),
  }).optional(),
  componentId: Joi.string().optional(),
  componentProperties: Joi.object().optional(),
}).id("figmaNode");

// Component metadata schema
const metadataSchema = Joi.object({
  fileKey: Joi.string().required(),
  fileName: Joi.string().required(),
  version: Joi.string().optional(),
  lastModified: Joi.string().optional(),
  author: Joi.object({
    id: Joi.string(),
    name: Joi.string(),
    email: Joi.string().email(),
  }).optional(),
  selectedNodes: Joi.array().items(Joi.string()).optional(),
  currentPage: Joi.object({
    id: Joi.string(),
    name: Joi.string(),
  }).optional(),
  viewport: Joi.object({
    x: Joi.number(),
    y: Joi.number(),
    zoom: Joi.number(),
  }).optional(),
  figmaVersion: Joi.string().optional(),
});

// Main Figma data validation schema
const figmaDataSchema = Joi.object({
  components: Joi.array().items(figmaNodeSchema).min(1).required(),
  metadata: metadataSchema.required(),
  sessionId: Joi.string().optional(),
  timestamp: Joi.string().isoDate().optional(),
});

// Component transformation request schema
const componentRequestSchema = Joi.object({
  components: Joi.array().items(figmaNodeSchema).min(1).required(),
  sessionId: Joi.string().optional(),
  options: Joi.object({
    framework: Joi.string().valid("react", "vue", "angular").default("react"),
    typescript: Joi.boolean().default(true),
    styling: Joi.string()
      .valid("css", "scss", "styled-components", "tailwind", "emotion")
      .default("css"),
    componentNaming: Joi.string()
      .valid("pascal", "camel", "kebab")
      .default("pascal"),
    includeProps: Joi.boolean().default(true),
    includeTypes: Joi.boolean().default(true),
    generateStorybook: Joi.boolean().default(false),
    generateTests: Joi.boolean().default(false),
    extractTokens: Joi.boolean().default(true),
    optimizeImages: Joi.boolean().default(true),
    responsiveBreakpoints: Joi.array().items(Joi.string()).optional(),
    customMappings: Joi.object().optional(),
  }).optional(),
});

// Middleware functions
const validateFigmaData = (req, res, next) => {
  const { error } = figmaDataSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    error.isJoi = true;
    return next(error);
  }

  next();
};

const validateComponentRequest = (req, res, next) => {
  const { error } = componentRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    error.isJoi = true;
    return next(error);
  }

  next();
};

module.exports = {
  figmaDataSchema,
  componentRequestSchema,
  validateFigmaData,
  validateComponentRequest,
};
