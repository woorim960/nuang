args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  stop("Usage: Rscript run_ordinal_cfa.R <analysis_attempt_wide.csv> <output_dir>")
}

required <- c(lavaan = "0.6-21", semTools = "0.5-9")
for (package_name in names(required)) {
  if (!requireNamespace(package_name, quietly = TRUE)) {
    stop(paste("Missing required package:", package_name))
  }
  if (packageVersion(package_name) < package_version(required[[package_name]])) {
    stop(paste("Package is older than locked minimum:", package_name))
  }
}

input_path <- normalizePath(args[[1]], mustWork = TRUE)
output_dir <- args[[2]]
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
data <- read.csv(input_path, check.names = FALSE, na.strings = c("", "NA"))
ordered_items <- c("NU_B1_001", "NU_B1_002", "NU_B1_003", "NU_B1_004", "NU_B1_005", "NU_B1_006", "NU_B1_007", "NU_B1_008", "NU_B1_009", "NU_B1_010", "NU_B1_011", "NU_B1_012", "NU_B1_013", "NU_B1_014", "NU_B1_015", "NU_B1_016", "NU_B1_017", "NU_B1_018", "NU_B1_019", "NU_B1_020", "NU_B1_021", "NU_B1_022", "NU_B1_023", "NU_B1_024", "NU_B1_025", "NU_B1_026", "NU_B1_027", "NU_B1_028", "NU_B1_029", "NU_B1_030", "NU_B1_031", "NU_B1_032", "NU_B1_033", "NU_B1_034", "NU_B1_035", "NU_B1_036", "NU_B1_037", "NU_B1_038", "NU_B1_039", "NU_B1_040", "NU_B1_041", "NU_B1_042", "NU_B1_043", "NU_B1_044", "NU_B1_045", "NU_B1_046", "NU_B1_047", "NU_B1_048", "NU_B1_049", "NU_B1_050", "NU_B1_051", "NU_B1_052", "NU_B1_053", "NU_B1_054", "NU_B1_055", "NU_B1_056", "NU_B1_057", "NU_B1_058", "NU_B1_059", "NU_B1_060")
missing_items <- setdiff(ordered_items, names(data))
if (length(missing_items) > 0) {
  stop(paste("Missing locked items:", paste(missing_items, collapse = ", ")))
}
if (any(vapply(data[ordered_items], function(column) {
  any(!is.na(column) & !(column %in% 1:5))
}, logical(1)))) {
  stop("Ordered item values must be 1..5 or NA")
}
data[ordered_items] <- lapply(data[ordered_items], ordered)

models <- list(
  M1_TEN_CORRELATED_FACETS = "ER_IR =~ NU_B1_005 + NU_B1_015 + NU_B1_025 + NU_B1_035 + NU_B1_045 + NU_B1_055\nER_WD =~ NU_B1_009 + NU_B1_019 + NU_B1_029 + NU_B1_039 + NU_B1_049 + NU_B1_059\nOE_AE =~ NU_B1_002 + NU_B1_012 + NU_B1_022 + NU_B1_032 + NU_B1_042 + NU_B1_052\nOE_CI =~ NU_B1_007 + NU_B1_017 + NU_B1_027 + NU_B1_037 + NU_B1_047 + NU_B1_057\nOE_IE =~ NU_B1_010 + NU_B1_020 + NU_B1_030 + NU_B1_040 + NU_B1_050 + NU_B1_060\nRO_EC =~ NU_B1_003 + NU_B1_013 + NU_B1_023 + NU_B1_033 + NU_B1_043 + NU_B1_053\nSE_AI =~ NU_B1_006 + NU_B1_016 + NU_B1_026 + NU_B1_036 + NU_B1_046 + NU_B1_056\nSE_RE =~ NU_B1_001 + NU_B1_011 + NU_B1_021 + NU_B1_031 + NU_B1_041 + NU_B1_051\nSM_EP =~ NU_B1_004 + NU_B1_014 + NU_B1_024 + NU_B1_034 + NU_B1_044 + NU_B1_054\nSM_OS =~ NU_B1_008 + NU_B1_018 + NU_B1_028 + NU_B1_038 + NU_B1_048 + NU_B1_058",
  M2_FIVE_CORRELATED_AXES = "ER =~ NU_B1_005 + NU_B1_009 + NU_B1_015 + NU_B1_019 + NU_B1_025 + NU_B1_029 + NU_B1_035 + NU_B1_039 + NU_B1_045 + NU_B1_049 + NU_B1_055 + NU_B1_059\nOE =~ NU_B1_002 + NU_B1_007 + NU_B1_010 + NU_B1_012 + NU_B1_017 + NU_B1_020 + NU_B1_022 + NU_B1_027 + NU_B1_030 + NU_B1_032 + NU_B1_037 + NU_B1_040 + NU_B1_042 + NU_B1_047 + NU_B1_050 + NU_B1_052 + NU_B1_057 + NU_B1_060\nRO =~ NU_B1_003 + NU_B1_013 + NU_B1_023 + NU_B1_033 + NU_B1_043 + NU_B1_053\nSE =~ NU_B1_001 + NU_B1_006 + NU_B1_011 + NU_B1_016 + NU_B1_021 + NU_B1_026 + NU_B1_031 + NU_B1_036 + NU_B1_041 + NU_B1_046 + NU_B1_051 + NU_B1_056\nSM =~ NU_B1_004 + NU_B1_008 + NU_B1_014 + NU_B1_018 + NU_B1_024 + NU_B1_028 + NU_B1_034 + NU_B1_038 + NU_B1_044 + NU_B1_048 + NU_B1_054 + NU_B1_058",
  M5_REVERSE_METHOD_FACTOR = "ER_IR =~ NU_B1_005 + NU_B1_015 + NU_B1_025 + NU_B1_035 + NU_B1_045 + NU_B1_055\nER_WD =~ NU_B1_009 + NU_B1_019 + NU_B1_029 + NU_B1_039 + NU_B1_049 + NU_B1_059\nOE_AE =~ NU_B1_002 + NU_B1_012 + NU_B1_022 + NU_B1_032 + NU_B1_042 + NU_B1_052\nOE_CI =~ NU_B1_007 + NU_B1_017 + NU_B1_027 + NU_B1_037 + NU_B1_047 + NU_B1_057\nOE_IE =~ NU_B1_010 + NU_B1_020 + NU_B1_030 + NU_B1_040 + NU_B1_050 + NU_B1_060\nRO_EC =~ NU_B1_003 + NU_B1_013 + NU_B1_023 + NU_B1_033 + NU_B1_043 + NU_B1_053\nSE_AI =~ NU_B1_006 + NU_B1_016 + NU_B1_026 + NU_B1_036 + NU_B1_046 + NU_B1_056\nSE_RE =~ NU_B1_001 + NU_B1_011 + NU_B1_021 + NU_B1_031 + NU_B1_041 + NU_B1_051\nSM_EP =~ NU_B1_004 + NU_B1_014 + NU_B1_024 + NU_B1_034 + NU_B1_044 + NU_B1_054\nSM_OS =~ NU_B1_008 + NU_B1_018 + NU_B1_028 + NU_B1_038 + NU_B1_048 + NU_B1_058\nREV_METHOD =~ NU_B1_011 + NU_B1_012 + NU_B1_013 + NU_B1_014 + NU_B1_015 + NU_B1_016 + NU_B1_017 + NU_B1_018 + NU_B1_019 + NU_B1_020 + NU_B1_021 + NU_B1_022 + NU_B1_023 + NU_B1_024 + NU_B1_025 + NU_B1_026 + NU_B1_027 + NU_B1_028 + NU_B1_029 + NU_B1_030 + NU_B1_051 + NU_B1_052 + NU_B1_053 + NU_B1_054 + NU_B1_055 + NU_B1_056 + NU_B1_057 + NU_B1_058 + NU_B1_059 + NU_B1_060\nSE_RE ~~ 0*REV_METHOD\nOE_AE ~~ 0*REV_METHOD\nRO_EC ~~ 0*REV_METHOD\nSM_EP ~~ 0*REV_METHOD\nER_IR ~~ 0*REV_METHOD\nSE_AI ~~ 0*REV_METHOD\nOE_CI ~~ 0*REV_METHOD\nSM_OS ~~ 0*REV_METHOD\nER_WD ~~ 0*REV_METHOD\nOE_IE ~~ 0*REV_METHOD"
)

fit_rows <- list()
for (model_id in names(models)) {
  fit <- lavaan::cfa(
    model = models[[model_id]],
    data = data,
    ordered = ordered_items,
    estimator = "WLSMV",
    missing = "pairwise",
    std.lv = TRUE
  )
  saveRDS(fit, file.path(output_dir, paste0(model_id, ".rds")))
  measures <- lavaan::fitMeasures(
    fit,
    c("chisq.scaled", "df.scaled", "cfi.robust", "tli.robust",
      "rmsea.robust", "rmsea.ci.lower.robust", "rmsea.ci.upper.robust", "srmr")
  )
  fit_rows[[model_id]] <- data.frame(
    model_id = model_id,
    converged = lavaan::lavInspect(fit, "converged"),
    improper_variance_count = sum(
      lavaan::parameterEstimates(fit)$op == "~~" &
      lavaan::parameterEstimates(fit)$lhs ==
        lavaan::parameterEstimates(fit)$rhs &
      lavaan::parameterEstimates(fit)$est < 0
    ),
    t(measures),
    check.names = FALSE
  )
  write.csv(
    lavaan::standardizedSolution(fit),
    file.path(output_dir, paste0(model_id, "_standardized.csv")),
    row.names = FALSE
  )
}
write.csv(
  do.call(rbind, fit_rows),
  file.path(output_dir, "fit_summary.csv"),
  row.names = FALSE
)
writeLines(capture.output(sessionInfo()), file.path(output_dir, "session_info.txt"))
